module.exports = {
  apps: [
    {
      name: 'instituto-sentidos',
      script: 'server-dist/server/index.js',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        PORT: 4000,
      },
      max_memory_restart: '512M',
      error_file: './logs/error.log',
      out_file: './logs/output.log',
      time: true,
    },
  ],
};
