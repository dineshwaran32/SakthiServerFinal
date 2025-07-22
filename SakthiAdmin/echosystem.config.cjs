module.exports = {
    apps: [
      {
        name: "sakthi-server",
        script: "cmd",
        args: "/c npm run server",
      },
      {
        name: "sakthi-client",
        script: "cmd",
        args: "/c npm run client",
      }
    ]
  };