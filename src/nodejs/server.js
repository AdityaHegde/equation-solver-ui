var express = require("express"),
    app = express();

app.get("/problem/getAll", dataHandler.handlerGet);
app.get("/hero/getAll", dataHandler.handlerGetAll);

app.use("/", express.static('./public'));

app.listen(parseInt(process.env.OPENSHIFT_NODEJS_PORT) || 8080, process.env.OPENSHIFT_NODEJS_IP || "127.0.0.1");
