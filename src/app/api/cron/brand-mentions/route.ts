import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  // 驗證 Vercel Cron 秘鑰（同其他 /api/cron/* route 一致）
  const authHeader = req.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const scriptPath = '/Users/ki/work/cloudpipe-macao-app/scripts/brand_mention_monitor.py';

  try {
    // Run the Python monitoring script
    const { stdout, stderr } = await execAsync(`python3 "${scriptPath}"`, {
      timeout: 300000 // 5 minute timeout
    });
    
    console.log('Brand mention monitor output:', stdout);
    if (stderr) {
      console.error('Brand mention monitor errors:', stderr);
    }
    
    return NextResponse.json({
      success: true,
      message: 'Brand mention monitoring completed',
      output: stdout
    });
  } catch (error) {
    console.error('Error running brand mention monitor:', error);
    return NextResponse.json(
      { error: 'Failed to run brand mention monitor', details: String(error) },
      { status: 500 }
    );
  }
}
