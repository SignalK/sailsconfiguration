/*
 * Copyright 2017 Teppo Kurki <teppo.kurki@iki.fi>
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
const openAPI = require('./openapi.json');

const pluginId = "sailsconfiguration";

module.exports = function(app) {
  let plugin = {};
  let timer;
  const debug = app.debug

  plugin.start = function(props) {
    debug("starting");
    function setDeltas() {
      let totalArea = 0;
      let activeArea = 0;
      let activeSails = [];
      const values = (props.sails || []).map(sail => {
        // No id or description in the sail as used in Signal K
        const sailClone = JSON.parse(JSON.stringify(sail));
        delete sailClone.id;
        delete sailClone.description;

        // Calculate into sail area available
        totalArea += sail.area;
        if (sail.active) {
          activeSails.push(sail.name);
          // Calculate into active sail area
          if (sail.reducedState && sail.reducedState.furledRatio) {
            activeArea += sail.area - (sail.area * sail.reducedState.furledRatio);
          } else {
            activeArea += sail.area;
          }
        }

        return {
          path: "sails.inventory." + sail.id,
          value: sailClone,
        };
      });
      values.push({
        path: 'sails.area.total',
        value: totalArea,
      });
      values.push({
        path: 'sails.area.active',
        value: activeArea,
      });
      app.handleMessage(pluginId, {
        updates: [
          {
            values: values
          }
        ]
      });
      if (activeArea > 0) {
        app.setPluginStatus(`${activeArea}m2 sail area active with ${activeSails.join(', ')}`);
      } else {
        app.setPluginStatus('No sails set as active.');
      }
    }
    timer = setInterval(setDeltas, props.deltaInterval * 1000);
    setDeltas();
    debug("started");
  };

  plugin.stop = function() {
    debug("stopping");
    timer && clearTimeout(timer);
    debug("stopped");
  };

  plugin.id = pluginId;
  plugin.name = "Sails Configuration";
  plugin.description =
    "Plugin that allows you to define your vessel's sails inventory and configuration";

  plugin.schema = {
    type: "object",
    required: ["deltaInterval"],
    properties: {
      deltaInterval: {
        title: 'How often should this plugin update the state, in seconds',
        type: "number",
        default: 60
      },
      sails: {
        type: "array",
        title: "Sail inventory",
        items: {
          type: "object",
          required: ["id", "name", "type", "area"],
          properties: {
            id: {
              type: "string",
              title: "Id",
              pattern: "(^[a-zA-Z0-9]+$)",
            },
            name: {
              type: "string",
              title: "Name"
            },
            description: {
              type: "string",
              title: "Description",
              'ui:widget': 'textarea',
            },
            type: {
              type: "string",
              title: "Sail type",
              enum: [
                "staysail",
                "headsail",
                "jib",
                "genoa",
                "spinnaker",
                "gennaker",
                "mainsail",
                "lug",
                "mizzen",
                "steadying sail",
              ],
            },
            material: {
              type: 'string',
              title: 'Material',
            },
            brand: {
              type: 'string',
              title: 'Brand',
            },
            active: {
              type: 'boolean',
              title: 'Whether the sail is currently in use',
              default: false,
            },
            area: {
              type: "number",
              title: "Sail area in square meters"
            },
            minimumWind: {
              type: "number",
              title: "The minimum wind speed this sail can be used with, in m/s",
            },
            maximumWind: {
              type: "number",
              title: "The maximum wind speed this sail can be used with, in m/s",
            },
            reefs: {
              type: "array",
              title: "Reefed sail areas",
              description: "In descending order, leave empty if no fixed reefs",
              items: {
                type: "number",
              }
            },
            continuousReefing: {
              type: "boolean",
              title: "The sail can be reefed continuously, with no discreet steps"
            },
            reducedState: {
              title: "Reefing state",
              type: 'object',
              properties: {
                reduced: {
                  type: 'boolean',
                  title: 'Whether the sail is reduced or not',
                },
                reefs: {
                  type: 'number',
                  title: 'Number of reefs set, 0 means full',
                  default: 0,
                },
                furledRatio: {
                  type: 'number',
                  title: 'Ratio of sail reduction, 0 means full and 1 is completely furled in',
                  default: 0,
                },
              },
            },
          }
        }
      }
    }
  };

  plugin.registerWithRouter = function(router) {
    router.get('/sails', function(req, res) {
      res.contentType('application/json');
      const { configuration } = app.readPluginOptions();
      const result = configuration.sails.map(function(sail) {
        return {
          id: sail.id,
          name: sail.name,
          active: sail.active,
          reducedState: sail.reducedState,
        };
      });
      res.send(JSON.stringify(result));
    });
    router.put('/sails', function(req, res) {
      res.contentType('application/json');
      const { configuration } = app.readPluginOptions();
      let failed = false;
      req.body.forEach(function (sail) {
        if (failed) {
          return;
        }
        const sailInConfig = configuration.sails.find(function (s) {
          if (s.id === sail.id) {
            return true;
          }
          return false;
        });
        if (!sailInConfig) {
          // Trying to set state to unknown sail, fail
          failed = true;
          res.sendStatus(400);
          return;
        }
        sailInConfig.active = sail.active;
        sailInConfig.reducedState = sail.reducedState;
      });
      if (failed) {
        return;
      }
      app.savePluginOptions(configuration, function (err) {
        if (err) {
          res.sendStatus(500);
          return;
        }
        res.sendStatus(200);
      });
    });
    router.post('/set/:id', function(req, res) {
      res.contentType('application/json');
      const { configuration } = app.readPluginOptions();
      const sailInConfig = configuration.sails.find(function (s) {
        if (s.id === req.params.id) {
          return true;
        }
        return false;
      });
      if (!sailInConfig) {
        res.sendStatus(404);
        return;
      }
      sailInConfig.active = req.body;
      app.savePluginOptions(configuration, function (err) {
        if (err) {
          res.sendStatus(500);
          return;
        }
        res.sendStatus(200);
      });
    });
    router.post('/reef/:id', function(req, res) {
      res.contentType('application/json');
      const { configuration } = app.readPluginOptions();
      const sailInConfig = configuration.sails.find(function (s) {
        if (s.id === req.params.id) {
          return true;
        }
        return false;
      });
      if (!sailInConfig) {
        res.sendStatus(404);
        return;
      }
      sailInConfig.reducedState = req.body;
      app.savePluginOptions(configuration, function (err) {
        if (err) {
          res.sendStatus(500);
          return;
        }
        res.sendStatus(200);
      });
    });
  };

  plugin.getOpenApi = function() {
    return openAPI;
  };

  return plugin;
};
