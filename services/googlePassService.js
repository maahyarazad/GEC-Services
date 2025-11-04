require('dotenv').config();
const fs = require("fs");
const { GoogleAuth } = require('google-auth-library');
const jwt = require('jsonwebtoken');
const googleConfig = JSON.parse(fs.readFileSync(process.env.GOOGLE_CONFIG, "utf8"));
const dbService = require('../services/dbService');

const issuerId = '3388000000022971699';

const classId = `${issuerId}.membership_class`;
const baseUrl = 'https://walletobjects.googleapis.com/walletobjects/v1';
const httpClient = new GoogleAuth({
    credentials: googleConfig,
    scopes: 'https://www.googleapis.com/auth/wallet_object.issuer'
});


function slugToTitle(slug) {
    return slug
        .replace(/-/g, ' ')                // Replace dashes with spaces
        .replace(/\b\w/g, char => char.toUpperCase()); // Capitalize first letter of each word
}

function titleToSlug(title) {
  return title
    .toLowerCase()            // convert to lowercase
    .replace(/\s+/g, '-')     // replace spaces (or multiple spaces) with dashes
    .replace(/[^\w-]+/g, ''); // remove any non-alphanumeric characters except dash
}


async function generateMemberGooglePass(data) {
    
    
    const title = slugToTitle(data.title);
    const event_page = titleToSlug(data.title);
    const { firstname, lastname, memberId, card_expiry_date, serial_number } = data;
    
   
    const qrValue = `${process.env.CLIENT_ORIGIN}/guest-registration/${event_page}?guest-code=${serial_number}`;
     const objectId = `${issuerId}.member_${Date.now()}`;
    
        const now = Math.floor(Date.now() / 1000);
        const _now = new Date(card_expiry_date);
    
        // Create a new date 12 months from now
        const expirationDate = new Date(
            _now.getFullYear(),
            _now.getMonth(),
            _now.getDate(),
            _now.getHours(),
            _now.getMinutes(),
            _now.getSeconds()
        );
    
        const options = { day: '2-digit', month: '2-digit', year: 'numeric' };
        const formattedDate = expirationDate.toLocaleDateString('en-GB', options).replace(/\//g, '-');
    
const genericClass = {
    id: classId,
    issuerName: "German Emirates Club",
    title: "German Emirates Club",
    programName: "German Emirates Club",
    reviewStatus: "underReview",
    hexBackgroundColor: "#D9B144",
    
    textModulesData: [
        {
            id: "game_overview",
            header: "Welcome",
            body: title
        }
    ],
    classTemplateInfo: {
        cardTemplateOverride: {
            cardRowTemplateInfos: [
                {
                    twoItems: {
                        startItem: {
                            firstValue: {
                                fields: [
                                    { fieldPath: 'object.textModulesData["cardnumber"].body' }
                                ]
                            }
                        },
                        endItem: {
                            firstValue: {
                                fields: [
                                    { fieldPath: 'object.textModulesData["serialNumber"].body' }
                                ]
                            }
                        }
                    }
                },
                {
                    twoItems: {
                        startItem: {
                            firstValue: {
                                fields: [
                                    { fieldPath: 'object.textModulesData["expiry"].body' }
                                ]
                            }
                        },
                        endItem: {
                            firstValue: {
                                fields: [] // optionally leave empty or add another field
                            }
                        }
                    }
                }
            ]
        }
    }
};

    
        const genericObject = {
            id: objectId,
            classId: classId,
            state: "active",
            hexBackgroundColor: "#0d1b2a",
            logo: {
    sourceUri: {
      uri: "https://services.german-emirates-club.com/uploads/logo.jpg"
    }
  },
            cardTitle: {
                defaultValue: {
                    language: "en-US",
                    value: `${title}`
                }
            },
            header: {
                defaultValue: {
                    language: "en-US",
                    value: `${firstname} ${lastname}`
                }
            },
            subheader: {
                defaultValue: {
                    language: "en-US",
                    value: `CARD HOLDER NAME`
                }
            },
            heroImage: {
                sourceUri: {
                    uri: "https://services.german-emirates-club.com/uploads/GEC_20_transparent.png"
                },
                contentDescription: {
                    defaultValue: {
                        language: "en-US",
                        value: "Hero Image Banner"
                    }
                }, logo: {
    sourceUri: {
      uri: "https://services.german-emirates-club.com/uploads/logo@2x.png"
    },
    contentDescription: {
      defaultValue: {
        language: "en-US",
        value: "German Emirates Club Logo"
      }
    }
  }
            },
            linksModuleData: {
                uris: [
                    {
                        id: "official_site",
                        uri: "https://www.german-emirates-club.com/",
                        description: "Visit German Emirates Club"
                    }
                ]
            },
            textModulesData: [
                {
                    id: "cardnumber",
                    header: "Member Id",
                    body: `${memberId}`
                },
                { id: "serialNumber", header: "Serial Number", body: `${serial_number}`},
                {
                    id: "expiry",
                    header: "Expiry Date",
                    body: `${formattedDate}`
                }
            ],
            barcode: {
                type: "QR_CODE",
                value: qrValue
            }, 
            validTimeInterval: {
                start: { date: new Date().toISOString() },
                end: { date: expirationDate.toISOString() }
            }
        };
    
    
        // TODO: Create the signed JWT and link
        const claims = {
            iss: googleConfig.client_email,
            aud: 'google',
            origins: [],
            typ: 'savetowallet',
            payload: {
                genericObjects: [
                    genericObject
                ]
            }
        };
       
        const jwtPayload = {
            iss: googleConfig.client_email,
            aud: 'google',
            typ: 'savetowallet',
            iat: now,
            exp: Math.floor(new Date(card_expiry_date).getTime() / 1000),
            payload: {
                genericClasses: [genericClass],
                genericObjects: [genericObject]
            }
        };
    
        const token = jwt.sign(jwtPayload, googleConfig.private_key, { algorithm: 'RS256' });
        const saveUrl = `${process.env.GOOGLE_PASS_BASE_PATH}${token}`;

    return saveUrl;
    
}
async function generateGooglePass(data) {
    
    
    const title = slugToTitle(data.title);
    const event_page = titleToSlug(data.title);
    const { firstName, lastName, event_id, event_date } = data;
    
   
    const qrValue = `${process.env.CLIENT_ORIGIN}/guest-registration/${event_page}?guest-code=${event_id}`;
     const objectId = `${issuerId}.member_${Date.now()}`;
    
    
        const now = Math.floor(Date.now() / 1000);
        const _now = new Date(event_date);
    
        // Create a new date 12 months from now
        const expirationDate = new Date(
            _now.getFullYear(),
            _now.getMonth(), // add 12 months
            _now.getDate() + 1,
            _now.getHours(),
            _now.getMinutes(),
            _now.getSeconds()
        );
        const JWTexpirationDate = new Date(
            _now.getFullYear() ,
            _now.getMonth() + 3, // add 12 months
            _now.getDate(),
            _now.getHours(),
            _now.getMinutes(),
            _now.getSeconds()
        );
    
        const options = { day: '2-digit', month: '2-digit', year: 'numeric' };
        const formattedDate = expirationDate.toLocaleDateString('en-GB', options).replace(/\//g, '-');
    
        const genericClass = {
            id: classId,
            issuerName: "German Emirates Club",
            title: "German Emirates Club",
            programName: "German Emirates Club",
            reviewStatus: "underReview",
            hexBackgroundColor: "#D9B144",

            textModulesData: [
                {
                    id: "game_overview",
                    header: "Welcome",
                    body: title
                }
            ],
            classTemplateInfo: {
                cardTemplateOverride: {
                    cardRowTemplateInfos: [
                        {
                            twoItems: {
                                startItem: {
                                    firstValue: {
                                        fields: [
                                            { fieldPath: 'object.textModulesData["cardnumber"].body' }
                                        ]
                                    }
                                },
                                endItem: {
                                    firstValue: {
                                        fields: [
                                            { fieldPath: 'object.textModulesData["expiry"].body' }
                                        ]
                                    }
                                }
                            }
                        }
                    ]
                }
            }
        };
    
        const genericObject = {
            id: objectId,
            classId: classId,
            state: "active",
            hexBackgroundColor: "#0d1b2a",
                         logo: {
    sourceUri: {
      uri: "https://services.german-emirates-club.com/uploads/logo.jpg"
    }
  },
            cardTitle: {
                defaultValue: {
                    language: "en-US",
                    value: "German Emirates Club"
                }
            },
            header: {
                defaultValue: {
                    language: "en-US",
                    value: `${firstName} ${lastName}`
                }
            },
            subheader: {
                defaultValue: {
                    language: "en-US",
                    value: `Event: ${title}`
                }
            },
            heroImage: {
                sourceUri: {
                    uri: "https://services.german-emirates-club.com/uploads/GEC_20_transparent.png"
                },
                contentDescription: {
                    defaultValue: {
                        language: "en-US",
                        value: "Hero Image Banner"
                    }
                }
            },
            linksModuleData: {
                uris: [
                    {
                        id: "official_site",
                        uri: "https://www.german-emirates-club.com/",
                        description: "Visit German Emirates Club"
                    }
                ]
            },
            textModulesData: [
                {
                    id: "cardnumber",
                    header: "Pass Id",
                    body: `${event_id}`
                },
                {
                    id: "expiry",
                    header: "Expiry Date",
                    body: `${formattedDate}`
                }
            ],
            barcode: {
                type: "QR_CODE",
                value: qrValue
            }, validTimeInterval: {
                start: { date: new Date().toISOString() },
                end: { date: expirationDate.toISOString() }
            }
        };
    
    
        // TODO: Create the signed JWT and link
        const claims = {
            iss: googleConfig.client_email,
            aud: 'google',
            origins: [],
            typ: 'savetowallet',
            payload: {
                genericObjects: [
                    genericObject
                ]
            }
        };
       
        const jwtPayload = {
            iss: googleConfig.client_email,
            aud: 'google',
            typ: 'savetowallet',
            iat: now,
            exp: Math.floor(new Date(JWTexpirationDate).getTime() / 1000),
            payload: {
                genericClasses: [genericClass],
                genericObjects: [genericObject]
            }
        };
    
        const token = jwt.sign(jwtPayload, googleConfig.private_key, { algorithm: 'RS256' });
        const saveUrl = `${process.env.GOOGLE_PASS_BASE_PATH}${token}`;

    return saveUrl;
    
}


module.exports = { generateGooglePass, generateMemberGooglePass }