module.exports = {
  /**
   * Application configuration section
   * http://pm2.keymetrics.io/docs/usage/application-declaration/
   */
  apps: [
    // First application
    {
      name: 'MyCommunity Beta',
      script: 'src/compiled.js',
      restart_delay: 5000,
      instances: 1, // How many app do we need ?
      max_restarts: 1000, // then we have a problem ?!
      exec_mode: 'cluster',
      env_production: {
        NODE_ENV: process.env.NODE_ENV,
      },
    },
  ],
};
