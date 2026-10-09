import importlib.util
import json
import os
import tempfile
import subprocess
import unittest
import yaml
from pathlib import Path
from unittest.mock import patch

SPEC = importlib.util.spec_from_file_location('deploy', Path(__file__).parents[1] / 'sitemap-deploy.py')
d = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(d)
SITE = 'https://cloudpipemo.com'
ENV = {'NEXT_PUBLIC_SITE_URL': SITE, 'NEXT_PUBLIC_SUPABASE_URL': 'https://test.supabase.co',
       'SUPABASE_SERVICE_ROLE_KEY': 'sb_secret_test', 'VERCEL_TOKEN': 'secret-vercel',
       'VERCEL_PROJECT_ID': 'prj_test', 'VERCEL_REVALIDATE_TOKEN': 'secret-revalidate',
       'GITHUB_REF': 'refs/heads/main'}


def xml(root='urlset', urls=None):
    entry = 'url' if root == 'urlset' else 'sitemap'
    urls = urls if urls is not None else [SITE + '/macao']
    return (f'<{root} xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">' +
            ''.join(f'<{entry}><loc>{u}</loc></{entry}>' for u in urls) + f'</{root}>').encode()


class Stages(unittest.TestCase):
    def setUp(self):
        self.env = patch.dict(os.environ, ENV, clear=True)
        self.env.start()
        self.addCleanup(self.env.stop)

    def test_preflight_rejects_missing_credentials_before_writes(self):
        del os.environ['SUPABASE_SERVICE_ROLE_KEY']
        with self.assertRaisesRegex(d.StageError, 'Missing configuration'):
            d.preflight({})

    def test_branch_guard(self):
        os.environ['GITHUB_REF'] = 'refs/heads/fix'
        with self.assertRaisesRegex(d.StageError, 'restricted to main'):
            d.preflight({})

    def test_status_classification(self):
        for code, classification in [(200, 'available'), (206, 'available'),
                                     (401, 'authentication_failed'), (403, 'authentication_failed'),
                                     (503, 'service_error'), (404, 'unexpected_response')]:
            self.assertEqual(d.db_status(code), classification)

    def test_force_cannot_bypass_401(self):
        os.environ['FORCE_REGENERATE'] = 'true'
        state = {}
        with patch.object(d, 'request', return_value=(401, b'No API key found')), self.assertRaisesRegex(d.StageError, 'authentication_failed'):
            d.db(state)
        self.assertEqual(state['db_classification'], 'authentication_failed')

    def test_secret_key_is_apikey_only(self):
        with patch.object(d, 'request', return_value=(200, b'[{"id":1}]')) as req:
            self.assertEqual(d.db({})['status'], 'available')
        self.assertEqual(req.call_args.kwargs['headers'], {'apikey': 'sb_secret_test'})

    def test_legacy_jwt_headers(self):
        os.environ['SUPABASE_SERVICE_ROLE_KEY'] = 'eyJ.test.jwt'
        with patch.object(d, 'request', return_value=(206, b'[{"id":1}]')) as req:
            d.db({})
        self.assertEqual(req.call_args.kwargs['headers']['Authorization'], 'Bearer eyJ.test.jwt')

    def test_empty_or_invalid_db_response_is_not_healthy(self):
        for body in [b'[]', b'{}', b'not json']:
            with patch.object(d, 'request', return_value=(200, body)), self.assertRaises(d.StageError):
                d.db({})

    def test_timeout_is_unknown_not_database_down(self):
        state = {}
        with patch.object(d, 'request', side_effect=d.StageError('Network/timeout')), self.assertRaises(d.StageError):
            d.db(state)
        self.assertEqual(state['db_classification'], 'unreachable')

    def test_push_failure_blocks_every_downstream_stage(self):
        state = {'db': {'status': 'available'}}
        with patch.object(d, 'request') as req:
            for call in [d.wait_deployment, d.revalidate, d.verify, lambda s: d.submit(s, 'google')]:
                with self.assertRaises(d.StageError):
                    call(state)
            req.assert_not_called()

    def deployment_state(self):
        return {'pushed': {'status': 'pushed', 'sha': 'abc', 'changed': True}}

    def candidate(self, sha='abc', target='production', ready='READY'):
        return {'uid': 'dpl_test', 'meta': {'githubCommitSha': sha}, 'target': target, 'state': ready}

    def test_deployment_ready_requires_exact_sha_production_and_alias(self):
        responses = [{'deployments': [self.candidate()]}, {'deploymentId': 'dpl_test', 'projectId': 'prj_test'}]
        with patch.object(d, 'checked_json', side_effect=responses):
            result = d.wait_deployment(self.deployment_state(), sleep=lambda _: None, clock=lambda: 0)
        self.assertEqual(result['sha'], 'abc')

    def test_old_sha_preview_and_old_alias_do_not_confirm_deployment(self):
        for listing, alias in [([self.candidate(sha='old')], {}),
                               ([self.candidate(target='preview')], {}),
                               ([self.candidate()], {'deploymentId': 'old', 'projectId': 'prj_test'}),
                               ([self.candidate()], {'deploymentId': 'dpl_test', 'projectId': 'wrong'})]:
            clock = iter([0, 0, 1000])
            with patch.object(d, 'checked_json', side_effect=[{'deployments': listing}, alias]), self.assertRaisesRegex(d.StageError, 'timeout'):
                d.wait_deployment(self.deployment_state(), sleep=lambda _: None, clock=lambda: next(clock))

    def test_deployment_error_fails_and_blocks_revalidation(self):
        with patch.object(d, 'checked_json', return_value={'deployments': [self.candidate(ready='ERROR')]}), self.assertRaisesRegex(d.StageError, 'ERROR'):
            d.wait_deployment(self.deployment_state(), clock=lambda: 0)

    def test_hook_http_failure_is_not_deployed(self):
        os.environ['VERCEL_DEPLOY_HOOK'] = 'https://api.vercel.com/v1/integrations/deploy/secret'
        with patch.object(d, 'request', return_value=(403, b'')), self.assertRaisesRegex(d.StageError, 'hook failed'):
            d.wait_deployment(self.deployment_state())

    def test_revalidation_uses_real_endpoint_and_body_contract(self):
        with patch.object(d, 'checked_json', return_value={'revalidated': ['path:' + p for p in d.SITEMAP_PATHS], 'failed': []}) as req:
            d.revalidate({'deployment': {'status': 'ready'}})
        self.assertEqual(req.call_args.args[0], SITE + '/api/revalidate')
        self.assertEqual(req.call_args.kwargs['payload']['token'], 'secret-revalidate')

    def test_partial_revalidation_200_fails(self):
        for response in [{'revalidated': [], 'failed': []}, {'revalidated': ['path:' + p for p in d.SITEMAP_PATHS], 'failed': ['bad']}]:
            with patch.object(d, 'checked_json', return_value=response), self.assertRaisesRegex(d.StageError, 'incomplete'):
                d.revalidate({'deployment': {'status': 'ready'}})

    def test_verify_xml_every_child_independent_of_local_count(self):
        def response(url, **kwargs):
            return 200, xml('sitemapindex', [SITE + p for p in d.SITEMAP_PATHS if p != '/sitemap_index.xml']) if url.endswith('/sitemap_index.xml') else xml()
        with patch.object(d, 'request', side_effect=response) as req:
            result = d.verify({'revalidate': {'status': 'revalidated'}, 'pushed': {'local_generation': {'total_urls': 2174}}})
        self.assertEqual(len(result['online_counts']), len(d.SITEMAP_PATHS))
        self.assertEqual(req.call_count, len(d.SITEMAP_PATHS))
        self.assertEqual(result['online_counts']['/sitemap.xml'], 1)

    def test_bad_online_xml_blocks_submissions(self):
        for body in [b'<html>error</html>', xml(urls=[]), xml(urls=['https://wrong.com/a']), b'<urlset>']:
            with patch.object(d, 'request', return_value=(200, body)), self.assertRaises(d.StageError):
                d.verify({'revalidate': {'status': 'revalidated'}})
        with patch.object(d, 'request') as req, self.assertRaises(d.StageError):
            d.submit({'verify': {'status': 'failed'}}, 'google')
        req.assert_not_called()

    def test_child_http_failure_fails_verification(self):
        with patch.object(d, 'request', return_value=(500, b'')), self.assertRaisesRegex(d.StageError, 'HTTP 500'):
            d.verify({'revalidate': {'status': 'revalidated'}})

    def verified(self):
        return {'verify': {'status': 'verified', 'sitemap_url': SITE + '/sitemap_index.xml'}}

    def test_unconfigured_search_providers_explicitly_skipped(self):
        with patch.object(d, 'request') as req:
            for provider in ['google', 'bing', 'indexnow']:
                self.assertEqual(d.submit(self.verified(), provider)['status'], 'skipped')
            req.assert_not_called()

    def test_google_uses_search_console_put_after_oauth_refresh(self):
        os.environ.update({'GOOGLE_OAUTH_CLIENT_ID': 'id', 'GOOGLE_OAUTH_CLIENT_SECRET': 'secret', 'GOOGLE_OAUTH_REFRESH_TOKEN': 'refresh', 'GOOGLE_SEARCH_CONSOLE_SITE_URL': SITE + '/'})
        with patch.object(d, 'checked_json', return_value={'access_token': 'access'}), patch.object(d, 'request', return_value=(204, b'')) as req:
            self.assertEqual(d.submit(self.verified(), 'google')['status'], 'submitted')
        self.assertEqual(req.call_args.kwargs['method'], 'PUT')
        self.assertIn('/sitemaps/', req.call_args.args[0])
        self.assertNotIn('/ping?', req.call_args.args[0])

    def test_google_401_does_not_report_submitted(self):
        os.environ.update({'GOOGLE_OAUTH_CLIENT_ID': 'id', 'GOOGLE_OAUTH_CLIENT_SECRET': 'secret', 'GOOGLE_OAUTH_REFRESH_TOKEN': 'refresh', 'GOOGLE_SEARCH_CONSOLE_SITE_URL': SITE + '/'})
        with patch.object(d, 'checked_json', return_value={'access_token': 'access'}), patch.object(d, 'request', return_value=(401, b'')), self.assertRaisesRegex(d.StageError, 'HTTP 401'):
            d.submit(self.verified(), 'google')

    def test_bing_api_body_error_fails_even_on_200(self):
        os.environ['BING_WEBMASTER_API_KEY'] = 'key'
        with patch.object(d, 'checked_json', return_value={'ErrorCode': 'Unauthorized'}), self.assertRaises(d.StageError):
            d.submit(self.verified(), 'bing')
        with patch.object(d, 'checked_json', return_value={'d': None}):
            self.assertEqual(d.submit(self.verified(), 'bing')['status'], 'submitted')

    def test_indexnow_202_is_pending_not_validated(self):
        os.environ['BING_INDEXNOW_KEY'] = 'key'
        with patch.object(d, 'request', side_effect=[(200, b'key'), (202, b'')]):
            self.assertEqual(d.submit(self.verified(), 'indexnow')['status'], 'accepted_pending_validation')

    def test_indexnow_key_mismatch_prevents_submission(self):
        os.environ['BING_INDEXNOW_KEY'] = 'key'
        with patch.object(d, 'request', return_value=(200, b'wrong')) as req, self.assertRaises(d.StageError):
            d.submit(self.verified(), 'indexnow')
        self.assertEqual(req.call_count, 1)

    def test_email_status_and_json_payload(self):
        os.environ['SENDGRID_API_KEY'] = 'key'
        state = {'db': {'status': 'failed', 'error': 'authentication_failed'}}
        with patch.object(d, 'request', return_value=(202, b'')) as req:
            self.assertEqual(d.notify(state)['status'], 'accepted')
        body = req.call_args.kwargs['payload']['content'][0]['value']
        self.assertIn('deployment: not_run', body)
        self.assertNotIn('Auto-deployment complete', body)
        with patch.object(d, 'request', return_value=(403, b'')), self.assertRaises(d.StageError):
            d.notify(state)

    def test_failure_receipt_and_summary_do_not_invent_deployment(self):
        with tempfile.TemporaryDirectory() as tmp, patch.object(d, 'STATE', Path(tmp) / 'state.json'), patch.object(d, 'request', return_value=(401, b'')):
            self.assertEqual(d.main('db'), 1)
            state = json.loads(d.STATE.read_text())
            self.assertEqual(state['db']['status'], 'failed')
            self.assertIn('deployment: not_run', d.report(state))
            self.assertNotIn('DOWN', d.report(state))

    def test_sensitive_redirects_are_not_followed(self):
        self.assertIsNone(d.NoRedirect().redirect_request(None, None, 302, '', {}, 'https://other.com'))


class WorkflowContract(unittest.TestCase):
    def test_permissions_branch_guard_and_stage_order(self):
        workflow = yaml.safe_load((Path(__file__).parents[2] / '.github/workflows/sitemap-auto-deploy.yml').read_text())
        self.assertEqual(workflow['permissions'], {'contents': 'read'})
        job = workflow['jobs']['check-db-and-deploy-sitemap']
        self.assertEqual(job['permissions'], {'contents': 'write'})
        self.assertEqual(job['if'], "github.ref == 'refs/heads/main'")
        steps = job['steps']
        ids = [step['id'] for step in steps if 'id' in step]
        self.assertEqual(ids, ['preflight', 'db_check', 'generate', 'commit', 'deployment',
                               'revalidate', 'verify', 'google', 'bing', 'indexnow', 'notify'])
        for step in steps:
            self.assertNotIn('continue-on-error', step)
            self.assertNotIn('force_regenerate', step.get('if', ''))
        self.assertIn('set -euo pipefail', next(s['run'] for s in steps if s.get('id') == 'generate'))
        commit = next(s['run'] for s in steps if s.get('id') == 'commit')
        self.assertLess(commit.index('git push origin HEAD:main'), commit.index('sitemap-deploy.py pushed'))
        for provider in ['google', 'bing', 'indexnow']:
            condition = next(s['if'] for s in steps if s.get('id') == provider)
            self.assertIn("steps.verify.outcome == 'success'", condition)
        self.assertEqual(next(s for s in steps if s.get('uses', '').startswith('actions/upload-artifact'))['if'], 'always()')

    def workflow_script(self, stage):
        w = yaml.safe_load((Path(__file__).parents[2] / '.github/workflows/sitemap-auto-deploy.yml').read_text())
        return next(s['run'] for s in w['jobs']['check-db-and-deploy-sitemap']['steps'] if s.get('id') == stage)

    def test_actual_bash_push_failure_never_records_success(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            git = root / 'git'
            git.write_text('#!/bin/sh\ncase "$1" in\n diff) exit 1;;\n push) echo "403 denied" >&2; exit 1;;\n *) exit 0;;\nesac\n')
            python = root / 'python3'
            python.write_text('#!/bin/sh\necho "receipt" > "$RECEIPT"\n')
            git.chmod(0o755)
            python.chmod(0o755)
            env = dict(os.environ, PATH=tmp + ':' + os.environ.get('PATH', '/usr/bin:/bin'), RECEIPT=str(root / 'receipt'))
            run = subprocess.run(['bash', '-c', self.workflow_script('commit')], env=env, capture_output=True)
            self.assertNotEqual(run.returncode, 0)
            self.assertFalse((root / 'receipt').exists())
            self.assertIn(b'403 denied', run.stderr)

    def test_actual_tee_pipeline_keeps_generator_failure(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            (root / 'node').write_text('#!/bin/sh\nexit 1\n')
            (root / 'python3').write_text('#!/bin/sh\necho receipt > "$RECEIPT"\n')
            (root / 'node').chmod(0o755)
            (root / 'python3').chmod(0o755)
            env = dict(os.environ, PATH=tmp + ':' + os.environ.get('PATH', '/usr/bin:/bin'), RECEIPT=str(root / 'receipt'))
            script = self.workflow_script('generate').replace('/tmp/sitemap-output.txt', str(root / 'output.txt'))
            run = subprocess.run(['bash', '-c', script], env=env, capture_output=True)
            self.assertNotEqual(run.returncode, 0)
            self.assertFalse((root / 'receipt').exists())

    def test_regression_ci_cannot_write_or_deploy(self):
        workflow = yaml.safe_load((Path(__file__).parents[2] / '.github/workflows/sitemap-regression.yml').read_text())
        self.assertEqual(workflow['permissions'], {'contents': 'read'})
        content = json.dumps(workflow)
        self.assertNotIn('secrets.', content)
        self.assertNotIn('sitemap-deploy.py deployment', content)


if __name__ == '__main__':
    unittest.main()
