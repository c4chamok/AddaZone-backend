import fs from 'node:fs';
import path from 'path';
import archiver from 'archiver';
import ora from 'ora';
import { NodeSSH } from 'node-ssh';
import { fileURLToPath } from 'node:url';

// npm install -D archiver ora node-ssh

const ssh = new NodeSSH();

const configData = JSON.parse(fs.readFileSync(path.join('./deployment', 'config.json'), 'utf-8'))
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


const CONFIG = {
  localProjectPath: configData.localProjectPath,
  zipFileName: configData.zipFileName,
  remoteZipPath: configData.remoteZipPath,
  remoteDeployDir: configData.remoteDeployDir,
  ssh: {
    host: configData.ssh.host,
    username: configData.ssh.username,
    privateKey: fs.readFileSync(path.join(__dirname, configData.ssh.privateKey), 'utf8'),
  },
};
console.log(CONFIG);


// Helper to zip the project
const zipProject = async () => {
  const spinner = ora('📦 Zipping project...').start();

  return new Promise((resolve, reject) => {
    const output = fs.createWriteStream(CONFIG.zipFileName);
    const archive = archiver('zip', { zlib: { level: 9 } });

    output.on('close', () => {
      spinner.succeed(`✅ Project zipped: ${archive.pointer()} bytes`);
      resolve();
    });

    archive.on('error', (err) => {
      spinner.fail('❌ Zipping failed');
      reject(err);
    });

    archive.pipe(output);

    archive.glob('**/*', {
      dot: true,
      ignore: ['node_modules/**', 'dist/**', 'generated/**', '.git/**', CONFIG.zipFileName],
    });

    archive.finalize();
  });
};

// Connect via SSH
const connectSSH = async () => {
  const spinner = ora('🔌 Connecting to server...').start();
  try {
    await ssh.connect(CONFIG.ssh);
    spinner.succeed('✅ Connected to server');
  } catch (err) {
    spinner.fail('❌ SSH connection failed');
    throw err;
  }
};

// Upload the ZIP file
const uploadZip = async () => {
  const spinner = ora('🚀 Uploading zip to server...').start();
  try {
    await ssh.putFile(CONFIG.zipFileName, CONFIG.remoteZipPath);
    spinner.succeed('✅ Zip uploaded');
  } catch (err) {
    spinner.fail('❌ Upload failed');
    throw err;
  }
};

// Extract on server and build
const runRemoteCommands = async () => {
  const spinner = ora('🔧 Unzipping and building on server...').start();
  try {
    const commands = [
      `rm -rf ${CONFIG.remoteDeployDir}`,
      `mkdir -p ${CONFIG.remoteDeployDir}`,
      `cd ${CONFIG.remoteDeployDir} && ls`,
      `unzip -o ${CONFIG.remoteZipPath} -d ${CONFIG.remoteDeployDir}`,
      `cd ${CONFIG.remoteDeployDir} && ls`,
      `cd ${CONFIG.remoteDeployDir} && export NVM_DIR="$HOME/.nvm";source $NVM_DIR/nvm.sh;cd ${CONFIG.remoteDeployDir};npm install;`,
      `cd ${CONFIG.remoteDeployDir} && ls`,
      `rm ${CONFIG.remoteZipPath}`,
      `cd ${CONFIG.remoteDeployDir} && ls`,
    ];

    for (const cmd of commands) {
      const output = await ssh.execCommand(cmd, { cwd: '/' });
      console.log(output);
    }

    spinner.succeed('✅ Remote build completed');
  } catch (err) {
    spinner.fail('❌ Remote command execution failed');
    throw err;
  }
};

// Cleanup local zip
const cleanupLocal = () => {
  const spinner = ora('🧹 Cleaning up local zip...').start();
  try {
    fs.unlinkSync(CONFIG.zipFileName);
    spinner.succeed('✅ Local zip deleted');
  } catch (err) {
    spinner.fail('❌ Failed to delete local zip');
    throw err;
  }
};

// Run everything
(async () => {
  try {
    await zipProject();
    await connectSSH();
    await uploadZip();
    await runRemoteCommands();
    cleanupLocal();

    console.log('\n🎉 Deployment successful!');
    process.exit(0);
  } catch (err) {
    console.error('\n💥 Deployment failed:', err.message);
    process.exit(1);
  }
})();

