const express = require('express');
const router = express.Router();
const path = require("path");
const fs = require("fs");
const { GoogleAuth } = require('google-auth-library');
const jwt = require('jsonwebtoken');
const googleConfig = JSON.parse(fs.readFileSync(process.env.GOOGLE_CONFIG, "utf8"));
const httpClient = new GoogleAuth({
    credentials: googleConfig,
    scopes: 'https://www.googleapis.com/auth/wallet_object.issuer'
});


router.get('/google-wallet', async (req, res) => {
  try {
  
    console.log(googleConfig.client_email); // just to check

    return res.json({
      status: true,
      googleConfig,
    });
    
  } catch (error) {
    console.error("Error in /registration:", error);
    return res.status(500).json({ status: false, message: 'Server error' });
  }
});


router.get('/google-wallet/create-pass-class/:email', async (req, res) => {
    
  return await createPassClass(req, res)
});

async function createPassClass(req, res) {
    const email = req.params.email;
    // console.log(req.body);


    // return res.status(200).json({ status: true, message: 'Server error' });

    let genericClass = {
        'id': `${classId}`,
        'classTemplateInfo': {
            'cardTemplateOverride': {
                'cardRowTemplateInfos': [
                    {
                        'twoItems': {
                            'startItem': {
                                'firstValue': {
                                    'fields': [
                                        {
                                            'fieldPath': `object.textModulesData["${email}"]`
                                        }
                                    ]
                                }
                            },
                            'endItem': {
                                'firstValue': {
                                    'fields': [
                                        {
                                            'fieldPath': 'object.textModulesData["contacts"]'
                                        }
                                    ]
                                }
                            }
                        }
                    }
                ]
            },
            'detailsTemplateOverride': {
                'detailsItemInfos': [
                    {
                        'item': {
                            'firstValue': {
                                'fields': [
                                    {
                                        'fieldPath': 'class.imageModulesData["event_banner"]'
                                    }
                                ]
                            }
                        }
                    },
                    {
                        'item': {
                            'firstValue': {
                                'fields': [
                                    {
                                        'fieldPath': 'class.textModulesData["game_overview"]'
                                    }
                                ]
                            }
                        }
                    },
                    {
                        'item': {
                            'firstValue': {
                                'fields': [
                                    {
                                        'fieldPath': 'class.linksModuleData.uris["official_site"]'
                                    }
                                ]
                            }
                        }
                    }
                ]
            }
        },
        'imageModulesData': [
            {
                'mainImage': {
                    'sourceUri': {
                        'uri': 'https://storage.googleapis.com/wallet-lab-tools-codelab-artifacts-public/google-io-2021-card.png'
                    },
                    'contentDescription': {
                        'defaultValue': {
                            'language': 'en-US',
                            'value': 'Google I/O 2022 Banner'
                        }
                    }
                },
                'id': 'event_banner'
            }
        ],
        'textModulesData': [
            {
                'header': 'Gather points meeting new people at Google I/O',
                'body': 'Join the game and accumulate points in this badge by meeting other attendees in the event.',
                'id': 'game_overview'
            }
        ],
        'linksModuleData': {
            'uris': [
                {
                    'uri': 'https://io.google/2022/',
                    'description': 'Official I/O \'22 Site',
                    'id': 'official_site'
                }
            ]
        }
    };

    let response;
    try {
        // Check if the class exists already
        response = await httpClient.request({
            url: `${baseUrl}/genericClass/${classId}`,
            method: 'GET'
        });

        console.log('Class already exists');
        console.log(response);
    } catch (err) {
        if (err.response && err.response.status === 404) {
            // Class does not exist
            // Create it now
            response = await httpClient.request({
                url: `${baseUrl}/genericClass`,
                method: 'POST',
                data: genericClass
            });

            console.log('Class insert response');
            console.log(response);
            return res.status(500).json({ status: false, message: 'Server error' });
        } else {
            // Something else went wrong
            console.log(err);
            return res.send('Something went wrong...check the console logs!');
            return res.status(500).json({ status: false, message: 'Server error' });
        }
    }
}

module.exports = router;