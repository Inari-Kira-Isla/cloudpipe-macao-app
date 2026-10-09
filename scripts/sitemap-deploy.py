#!/usr/bin/env python3
"""Auditable sitemap deployment stages; stdlib only. No stage implies the next."""
import json
import os
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET
from pathlib import Path

STATE = Path(os.environ.get('SITEMAP_DEPLOY_STATE', '/tmp/sitemap-deploy-state.json'))
NS = '{http://www.sitemaps.org/schemas/sitemap/0.9}'
SITEMAP_PATHS = ['/sitemap.xml', '/sitemap_index.xml', '/sitemap-priority.xml',
                 '/sitemap-standard.xml', '/sitemap-merchants.xml', '/sitemap-insights.xml',
                 '/sitemap-insights-en.xml', '/sitemap-insights-ja.xml', '/sitemap-mo.xml',
                 '/sitemap-hk.xml', '/sitemap-tw.xml', '/sitemap-jp.xml', '/sitemap-world.xml']


class StageError(Exception):
    pass


class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        return None


def request(url, method='GET', headers=None, payload=None, form=None, timeout=15):
    headers = dict(headers or {})
    if payload is not None:
        data = json.dumps(payload).encode()
        headers['Content-Type'] = 'application/json'
    elif form is not None:
        data = urllib.parse.urlencode(form).encode()
        headers['Content-Type'] = 'application/x-www-form-urlencoded'
    else:
        data = None
    try:
        # Never forward credentials (including deploy-hook query tokens) on redirects.
        with urllib.request.build_opener(NoRedirect).open(
                urllib.request.Request(url, data=data, method=method, headers=headers), timeout=timeout) as res:
            body = res.read(55_000_001)
            if len(body) > 55_000_000:
                raise StageError('Response exceeds size limit')
            return res.status, body
    except urllib.error.HTTPError as exc:
        return exc.code, b''  # Error bodies may contain request credentials; never log them.
    except (urllib.error.URLError, TimeoutError, OSError):
        raise StageError('Network/timeout error; service availability unknown') from None


def checked_json(url, **kwargs):
    status, body = request(url, **kwargs)
    if not 200 <= status < 300:
        raise StageError(f'HTTP {status}')
    try:
        return json.loads(body)
    except (ValueError, UnicodeError):
        raise StageError('Invalid JSON response') from None


def required(*names):
    missing = [name for name in names if not os.environ.get(name, '').strip()]
    if missing:
        raise StageError('Missing configuration: ' + ', '.join(missing))


def site():
    url = os.environ.get('NEXT_PUBLIC_SITE_URL', 'https://cloudpipemo.com').rstrip('/')
    parsed = urllib.parse.urlsplit(url)
    if parsed.scheme != 'https' or not parsed.netloc or parsed.path or parsed.query or parsed.fragment:
        raise StageError('NEXT_PUBLIC_SITE_URL must be an HTTPS origin')
    return url


def preflight(state):
    required('SUPABASE_SERVICE_ROLE_KEY', 'NEXT_PUBLIC_SUPABASE_URL',
             'VERCEL_TOKEN', 'VERCEL_PROJECT_ID', 'VERCEL_REVALIDATE_TOKEN')
    site()
    if os.environ.get('GITHUB_REF') != 'refs/heads/main':
        raise StageError('Production pipeline is restricted to main')
    return {'status': 'configured'}


def db_status(status):
    if status in (200, 206):
        return 'available'
    if status in (401, 403):
        return 'authentication_failed'
    if status >= 500:
        return 'service_error'
    return 'unexpected_response'


def db(state):
    required('SUPABASE_SERVICE_ROLE_KEY', 'NEXT_PUBLIC_SUPABASE_URL')
    key = os.environ['SUPABASE_SERVICE_ROLE_KEY'].strip()
    headers = {'apikey': key}
    # Legacy JWT keys need Bearer; modern sb_secret keys must use apikey only.
    if key.startswith('eyJ'):
        headers['Authorization'] = 'Bearer ' + key
    try:
        status, body = request(os.environ['NEXT_PUBLIC_SUPABASE_URL'].rstrip('/') +
                               '/rest/v1/merchants?limit=1&select=id', headers=headers)
    except StageError:
        state['db_classification'] = 'unreachable'
        raise
    classification = db_status(status)
    state['db_classification'] = classification
    if classification != 'available':
        raise StageError(f'{classification}: HTTP {status}; database availability unconfirmed')
    try:
        rows = json.loads(body)
    except ValueError:
        raise StageError('Invalid DB response; database availability unconfirmed') from None
    if not isinstance(rows, list) or not rows:
        raise StageError('No visible merchant row; data access/empty table requires investigation')
    return {'status': 'available', 'http_status': status}


def require_stage(state, stage, status):
    if state.get(stage, {}).get('status') != status:
        raise StageError(f'Requires {stage}={status}')


def generated(state):
    require_stage(state, 'db', 'available')
    stats = json.loads(Path(os.environ.get('SITEMAP_STATS_PATH', '/tmp/sitemap-stats.json')).read_text())
    urls = xml_document(Path('public/sitemap.xml').read_bytes(), 'urlset')
    if stats.get('total_urls') != len(urls):
        raise StageError('Local generation receipt does not match XML')
    return {'status': 'generated', 'local_generation': stats}


def pushed(state):
    require_stage(state, 'generated', 'generated')
    required('SITEMAP_COMMIT_SHA')
    stats = state['generated']['local_generation']
    return {'status': 'pushed', 'sha': os.environ['SITEMAP_COMMIT_SHA'], 'local_generation': stats,
            'changed': os.environ.get('SITEMAP_CHANGED') == 'true'}


def vercel_url(path, params=None):
    params = dict(params or {})
    if os.environ.get('VERCEL_ORG_ID'):
        params['teamId'] = os.environ['VERCEL_ORG_ID']
    return 'https://api.vercel.com' + path + ('?' + urllib.parse.urlencode(params) if params else '')


def wait_deployment(state, sleep=time.sleep, clock=time.monotonic):
    require_stage(state, 'pushed', 'pushed')
    required('VERCEL_TOKEN', 'VERCEL_PROJECT_ID')
    sha = state['pushed']['sha']
    project = os.environ['VERCEL_PROJECT_ID']
    headers = {'Authorization': 'Bearer ' + os.environ['VERCEL_TOKEN']}
    hook = os.environ.get('VERCEL_DEPLOY_HOOK')
    if hook and state['pushed']['changed']:
        status, _ = request(hook, method='POST')
        if not 200 <= status < 300:
            raise StageError(f'Vercel deploy hook failed: HTTP {status}')
    deadline = clock() + int(os.environ.get('VERCEL_WAIT_SECONDS', '720'))
    while clock() < deadline:
        listing = checked_json(vercel_url('/v6/deployments',
                               {'projectId': project, 'target': 'production', 'limit': 100}), headers=headers)
        candidates = [d for d in listing.get('deployments', [])
                      if d.get('meta', {}).get('githubCommitSha') == sha and d.get('target') == 'production']
        if candidates:
            deployment = candidates[0]  # API returns newest first; ignore an older failed retry.
            ready = deployment.get('readyState') or deployment.get('state')
            if ready in ('ERROR', 'CANCELED'):
                raise StageError(f'Vercel deployment {deployment.get("uid")} is {ready}')
            if ready == 'READY':
                alias = checked_json(vercel_url('/v4/aliases/' + urllib.parse.quote(
                                     urllib.parse.urlsplit(site()).netloc, safe='')), headers=headers)
                deployment_id = deployment.get('uid') or deployment.get('id')
                if (alias.get('deploymentId') == deployment_id and alias.get('projectId') == project
                        and not alias.get('redirect')):
                    return {'status': 'ready', 'sha': sha, 'deployment_id': deployment_id,
                            'alias': urllib.parse.urlsplit(site()).netloc}
        sleep(10)
    raise StageError('Deployment timeout: no READY production alias for pushed SHA; check Vercel Git integration/deploy hook')


def revalidate(state):
    require_stage(state, 'deployment', 'ready')
    required('VERCEL_REVALIDATE_TOKEN')
    result = checked_json(site() + '/api/revalidate', method='POST', payload={
        'token': os.environ['VERCEL_REVALIDATE_TOKEN'], 'paths': SITEMAP_PATHS})
    expected = {'path:' + p for p in SITEMAP_PATHS}
    if result.get('failed') != [] or not expected.issubset(set(result.get('revalidated', []))):
        raise StageError('Revalidation incomplete, even if endpoint returned HTTP 200')
    return {'status': 'revalidated', 'paths': SITEMAP_PATHS}


def xml_document(body, expected_root):
    if len(body) > 50_000_000:
        raise StageError('Sitemap exceeds 50 MB')
    try:
        root = ET.fromstring(body)
    except ET.ParseError:
        raise StageError('Invalid sitemap XML') from None
    if root.tag != NS + expected_root:
        raise StageError('Unexpected sitemap root/namespace')
    entry = 'url' if expected_root == 'urlset' else 'sitemap'
    rows = root.findall(NS + entry)
    if not rows or len(rows) > 50_000:
        raise StageError('Sitemap is empty or exceeds 50,000 entries')
    urls = []
    for row in rows:
        loc = row.findtext(NS + 'loc')
        if not loc or not loc.startswith(site() + '/'):
            raise StageError('Sitemap contains a missing or noncanonical URL')
        urls.append(loc)
    return urls


def verify(state):
    require_stage(state, 'revalidate', 'revalidated')
    counts = {}
    # Next sitemap.ts and sub-sitemap routes are authoritative; public/sitemap.xml is legacy.
    # Do not compare their counts/bytes against the local legacy generation.
    index_urls = None
    for path in SITEMAP_PATHS:
        # Cold ISR routes have a longer budget than auth/submission calls.
        status, body = request(site() + path, headers={'Cache-Control': 'no-cache'}, timeout=60)
        if status != 200:
            raise StageError(f'{path}: HTTP {status}')
        urls = xml_document(body, 'sitemapindex' if path == '/sitemap_index.xml' else 'urlset')
        counts[path] = len(urls)
        if path == '/sitemap_index.xml':
            index_urls = set(urls)
    expected = {site() + p for p in SITEMAP_PATHS if p != '/sitemap_index.xml'}
    if index_urls != expected:
        raise StageError('Sitemap index children differ from verified sitemap paths')
    return {'status': 'verified', 'online_counts': counts, 'sitemap_url': site() + '/sitemap_index.xml'}


def submit(state, provider):
    require_stage(state, 'verify', 'verified')
    sitemap = state['verify']['sitemap_url']
    if provider == 'google':
        names = ('GOOGLE_OAUTH_CLIENT_ID', 'GOOGLE_OAUTH_CLIENT_SECRET', 'GOOGLE_OAUTH_REFRESH_TOKEN', 'GOOGLE_SEARCH_CONSOLE_SITE_URL')
        if not any(os.environ.get(n) for n in names):
            return {'status': 'skipped', 'reason': 'Search Console OAuth not configured; deprecated ping is not used'}
        required(*names)
        auth = checked_json('https://oauth2.googleapis.com/token', method='POST', form={
            'client_id': os.environ[names[0]], 'client_secret': os.environ[names[1]],
            'refresh_token': os.environ[names[2]], 'grant_type': 'refresh_token'})
        if not auth.get('access_token'):
            raise StageError('OAuth access token missing')
        url = 'https://www.googleapis.com/webmasters/v3/sites/' + urllib.parse.quote(
            os.environ[names[3]], safe='') + '/sitemaps/' + urllib.parse.quote(sitemap, safe='')
        status, _ = request(url, method='PUT', headers={'Authorization': 'Bearer ' + auth['access_token']})
    elif provider == 'bing':
        if not os.environ.get('BING_WEBMASTER_API_KEY'):
            return {'status': 'skipped', 'reason': 'Bing Webmaster API key not configured'}
        url = 'https://ssl.bing.com/webmaster/api.svc/json/SubmitSitemap?' + urllib.parse.urlencode(
            {'apikey': os.environ['BING_WEBMASTER_API_KEY']})
        result = checked_json(url, method='POST', payload={'siteUrl': site(), 'feedUrl': sitemap})
        if 'd' not in result or result['d'] is not None:
            raise StageError('Unexpected Bing SubmitSitemap response')
        status = 200
    else:
        key = os.environ.get('BING_INDEXNOW_KEY')
        if not key:
            return {'status': 'skipped', 'reason': 'IndexNow key not configured'}
        status, body = request(site() + '/indexnow.txt')
        if status != 200 or body.decode().strip() != key:
            raise StageError('IndexNow public key file missing/mismatched')
        status, _ = request('https://api.indexnow.org/indexnow', method='POST', payload={
            'host': urllib.parse.urlsplit(site()).netloc, 'key': key,
            'keyLocation': site() + '/indexnow.txt',
            'urlList': [site() + p for p in ['/macao', '/macao/insights', '/llms.txt']]})
        if status == 202:
            return {'status': 'accepted_pending_validation', 'http_status': status}
        if status != 200:
            raise StageError(f'IndexNow HTTP {status}')
    if not 200 <= status < 300:
        raise StageError(f'{provider} HTTP {status}')
    return {'status': 'submitted', 'http_status': status}  # submission != indexing


def report(state):
    lines = ['## Sitemap deployment status']
    for stage in ['preflight', 'db', 'generated', 'pushed', 'deployment', 'revalidate', 'verify', 'google', 'bing', 'indexnow', 'notify']:
        result = state.get(stage, {'status': 'not_run'})
        lines.append(f'- {stage}: {result["status"]}' +
                     (f' — {result.get("reason") or result.get("error")}' if result.get('reason') or result.get('error') else ''))
    if state.get('db_classification'):
        lines.append('- DB probe classification: ' + state['db_classification'])
    lines.append('- Local generation counts: ' + json.dumps(state.get('generated', {}).get('local_generation')))
    lines.append('- Online sitemap counts: ' + json.dumps(state.get('verify', {}).get('online_counts')))
    lines.append('- Pushed SHA: ' + state.get('pushed', {}).get('sha', 'not pushed'))
    lines.append('- Deployment ID: ' + state.get('deployment', {}).get('deployment_id', 'unconfirmed'))
    lines.append('- Search engine submission does not prove indexing.')
    return '\n'.join(lines)


def notify(state):
    if not os.environ.get('SENDGRID_API_KEY'):
        return {'status': 'skipped', 'reason': 'SendGrid not configured'}
    status, _ = request('https://api.sendgrid.com/v3/mail/send', method='POST',
                        headers={'Authorization': 'Bearer ' + os.environ['SENDGRID_API_KEY']}, payload={
                            'personalizations': [{'to': [{'email': 'inariglobal@gmail.com'}]}],
                            'from': {'email': 'noreply@cloudpipe-macao-app.vercel.app'},
                            'subject': '[Sitemap] Workflow stage results',
                            'content': [{'type': 'text/plain', 'value': report(state)}]})
    if status != 202:
        raise StageError(f'SendGrid HTTP {status}')
    return {'status': 'accepted', 'http_status': status}


def main(command):
    state = json.loads(STATE.read_text()) if STATE.exists() else {}
    if command == 'summary':
        text = report(state)
        print(text)
        if os.environ.get('GITHUB_STEP_SUMMARY'):
            with open(os.environ['GITHUB_STEP_SUMMARY'], 'a') as output:
                output.write(text + '\n')
        return 0
    try:
        if command in ('google', 'bing', 'indexnow'):
            result = submit(state, command)
        else:
            result = {'preflight': preflight, 'db': db, 'generated': generated, 'pushed': pushed, 'deployment': wait_deployment,
                      'revalidate': revalidate, 'verify': verify, 'notify': notify}[command](state)
        state[command] = result
        code = 0
    except (StageError, ValueError, KeyError, TypeError, AttributeError, OSError):
        # Only StageError messages are safe to expose. Third-party exceptions may contain tokens.
        exc = sys.exc_info()[1]
        state[command] = {'status': 'failed', 'error': str(exc) if isinstance(exc, StageError) else 'Invalid configuration/response'}
        code = 1
    STATE.write_text(json.dumps(state, indent=2) + '\n')
    print(command + ': ' + state[command]['status'])
    return code


if __name__ == '__main__':
    sys.exit(main(sys.argv[1]))
