exports.config = {
  type: 'event',
  name: 'PullCode',
  subscribes: ['code-pushed'],
  emits: ['code-pulled'],
  flows: ['cicd-flow'],
};

exports.handler = async (context) => {
  const { exec } = require('child_process');
  const util = require('util');
  const execPromise = util.promisify(exec);
  const repoDir = '/home/ubuntu/app';
  const branch = 'main';
  const serverB = 'ubuntu@<server-b-ip>'; // Replace with Server B's IP

  try {
    const { stdout } = await execPromise(`ssh ${serverB} "cd ${repoDir} && git pull origin ${branch}"`);
    await context.emit('code-pulled', { commit: context.event.data.commit });
    return { status: 'Code pulled on Server B', output: stdout };
  } catch (error) {
    throw new Error(`Git pull failed on Server B: ${error.message}`);
  }
};
