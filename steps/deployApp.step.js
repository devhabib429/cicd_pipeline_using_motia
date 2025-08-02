exports.config = {
  type: 'event',
  name: 'DeployApp',
  subscribes: ['code-pulled'],
  emits: [],
  flows: ['cicd-flow'],
};

exports.handler = async (context) => {
  const { exec } = require('child_process');
  const util = require('util');
  const execPromise = util.promisify(exec);
  const repoDir = '/home/ubuntu/app';
  const serverB = 'ubuntu@<server-b-ip>'; // Replace with Server B's IP

  try {
    await execPromise(`ssh ${serverB} "cd ${repoDir} && npm install"`);
    await execPromise(`ssh ${serverB} "cd ${repoDir} && pm2 restart app"`);
    return { status: 'Deployment successful on Server B', commit: context.event.data.commit };
  } catch (error) {
    throw new Error(`Deployment failed on Server B: ${error.message}`);
  }
};
