const express = require('express');
const fs = require('fs');
const path = require('path');
const swaggerUiDist = require('swagger-ui-dist');

export default function setupSwaggerUI(app) {
  if (String(process.env.API_DOCUMENTATION_ENABLED) !== "true") {
    return;
  }

  const serveSwaggerDef = function serveSwaggerDef(req, res) {
    res.sendFile(path.resolve(__dirname, '../documentation/openapi.json'));
  };
  
  app.get('/documentation-config', serveSwaggerDef);

  const swaggerUiAssetPath = swaggerUiDist.getAbsoluteFSPath();
  const swaggerFiles = express.static(swaggerUiAssetPath);

  const urlRegex = /url: "[^"]*",/;

  const patchIndex = function patchIndex(req, res) {
    try {
      const indexContent = fs.readFileSync(path.join(swaggerUiAssetPath, 'index.html'), 'utf8')
        .replace(urlRegex, 'url: "../documentation-config",');
      res.send(indexContent);
    } catch (error) {
      res.status(500).send('Error reading Swagger UI index file.');
    }
  };

  app.get('/documentation', function getSwaggerRoot(req, res) {
    const targetUrl = req.originalUrl.endsWith('/') 
      ? req.originalUrl + 'index.html' 
      : req.originalUrl + '/index.html';
    res.redirect(targetUrl);
  });

  app.get('/documentation/index.html', patchIndex);

  app.use('/documentation', swaggerFiles);
}
