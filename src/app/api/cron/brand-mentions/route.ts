import { NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export const dynamic = 'force-dynamic';

export async function POST() {
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

// Also allow GET for manual trigger (e.g., via browser)
export async function GET() {
  return POST();
}
