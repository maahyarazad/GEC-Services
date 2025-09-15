const express = require('express');
const router = express.Router();
const path = require("path");
const fs = require("fs");
const { GoogleAuth } = require('google-auth-library');
const jwt = require('jsonwebtoken');
const googleConfig = JSON.parse(fs.readFileSync(process.env.GOOGLE_CONFIG, "utf8"));



const issuerId = '3388000000022971699';


const classId = `${issuerId}.membership_class`;

const baseUrl = 'https://walletobjects.googleapis.com/walletobjects/v1';

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


router.post('/google-wallet/create-pass-class/', async (req, res) => {

    return await createPassClass(req, res)
});

async function createPassClass(req, res) {
    const data = req.body;
    const email = `${data.email.replace(/[^\w.-]/g, '_')}`;
    const objectId = `${issuerId}.member_${Date.now()}`;


    const now = Math.floor(Date.now() / 1000);
    const _now = new Date();

    // Create a new date 12 months from now
    const expirationDate = new Date(
        _now.getFullYear(),
        _now.getMonth() + 12, // add 12 months
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
        title: "GEC Membership Card",
        programName: "German Emirates Club Membership",
        reviewStatus: "underReview",
        hexBackgroundColor: "#D9B144",
        textModulesData: [
            {
                id: "game_overview",
                header: "Welcome",
                body: "Your membership card"
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
        hexBackgroundColor: "#cc0000",
        cardTitle: {
            defaultValue: {
                language: "en-US",
                value: "Membership Card"
            }
        },
        header: {
            defaultValue: {
                language: "en-US",
                value: `${data.fullname}`
            }
        },
        subheader: {
            defaultValue: {
                language: "en-US",
                value: `Member ID: ${data.memberId}`
            }
        },
        heroImage: {
            sourceUri: {
                uri: "https://services.german-emirates-club.com/uploads/GEC_transparent.png"
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
                header: "Card Number",
                body: `${data.card_number}`
            },
            {
                id: "expiry",
                header: "Expiry Date",
                body: `${formattedDate}`
            }
        ],
        barcode: {
            type: "QR_CODE",
            value: "CARD123456"
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
        exp: now + 60 * 60, // 1 hour
        payload: {
            genericClasses: [genericClass],
            genericObjects: [genericObject]
        }
    };

    const token = jwt.sign(jwtPayload, googleConfig.private_key, { algorithm: 'RS256' });
    const saveUrl = `https://pay.google.com/gp/v/save/${token}`;

    res.send(`<a href='${saveUrl}'><img src='wallet-button.png'></a>`);
    // res.send("Form submitted!");
}

module.exports = router;