module.exports = {
  name: "pablobot", // Name of your application
  script: "src/index.ts", // Entry point of your application
  watch: true, // Enable watch & restart feature
  ignore_watch: ["node_modules", "logs", ".git", "src/public"], // Ignore watching files or folders
};
