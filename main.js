//i had to make some ts code into js

const express = require('express');
const expressWs = require('express-ws');
const axios = require('axios');
var clients = [];
const RobloxToken = "YOUR ROBLOX TOKEN HERE"
const app = express();
expressWs(app);

app.use(express.json());

app.get('/', function (req, res) {
    res.send('Hello World!');
});

_alphabets = {
    alphabet : "123456789*=+-aAbBcCdDeEfFgGhHiIjJkKlLmMnNoOpPqQrRsStTuUvVwWxXyYzZ",
    decimals: "0123456789"
}

function reverseString(inputStr) {
    let strArray = inputStr.split(" ")
    let reversedStrArray = strArray
      .map(word => {
        let charArray = word.split("")
        charArray.reverse()
  
        let reversed = charArray.join("")
        return reversed
      })
      .reverse()
  
    let reversedStr = reversedStrArray.join(" ")
    return reversedStr
}

function convert(inputStr, translation, newTranslation, shift) {
    if (!inputStr || !translation || !newTranslation) {
      return ""
    }

    let x = 0
    let baseValue = translation.length

    for (let i = 0; i < inputStr.length; i++) {
      const digit = inputStr[i]
      let digitIndex = translation.indexOf(digit) + 1
      digitIndex -= shift ? 1 : 0

      x = x * baseValue + digitIndex
    }

    if (x != 0) {
      let result = ""
      const newBaseVal = newTranslation.length

      while (x > 0) {
        let digitVal = x % newBaseVal
        digitVal -= shift ? 1 : 0
        let appendNew = digitVal == -1 ? "0" : newTranslation[digitVal]

        if (appendNew == undefined)
          return shift
            ? reverseString(`ID Error: ${digitVal} index is out of range`)
            : `ID Error: ${digitVal} index is out of range`

        result = `${appendNew}${result}`
        x = Math.floor(x / newBaseVal)
      }

      return result
    } else return newTranslation[0]
}

function Short(inputStr) {
    return reverseString(
      convert(
        inputStr,
        _alphabets.decimals,
        _alphabets.alphabet,
        true
      )
    )
  }
  

async function GetSessionToken(Cookie) {
    //ari's code
    let SessionToken = undefined;
    try {
        await axios({
            url: "https://auth.roblox.com/v2/logout",
            method: "POST",
            headers: {
                cookie: `.ROBLOSECURITY=${Cookie}`,
            },
        });
    } catch (AxiosResponse) {
        SessionToken = AxiosResponse.response ? AxiosResponse.response.headers["x-csrf-token"] : undefined;
        if (AxiosResponse && !AxiosResponse.response) {
            FetchError = AxiosResponse;
        }
    }
    if (SessionToken == undefined)
        return false;
    return SessionToken;
}

async function CheckIfUserOwnItem(AssetId, UserId) {
    try {
        return (await axios(`https://inventory.roblox.com/v1/users/${UserId}/items/Asset/${AssetId}/is-owned`)).data
    } catch(_) {
        return false;
    }
}

async function WhitelistAsset(AssetId, UserId) {
    const CreatorOwnedItem = await CheckIfUserOwnItem(AssetId, 5527624113);
    if (CreatorOwnedItem)
        return Short(AssetId.toString()) //yeah lol

    if (!Number.isNaN(UserId)) {
        const OwnItem = await CheckIfUserOwnItem(AssetId, UserId);
        console.log(OwnItem)
        console.log(AssetId)
        console.log(UserId)
        if (!OwnItem)
        return "U don't own this lol"
    }

    let SessionToken = await GetSessionToken(RobloxToken);

    console.log(SessionToken)

    let ItemData, ErrorResponse;
    try {
        ItemData = (await axios({
            url: `https://economy.roblox.com/v2/assets/${AssetId}/details`,
            method: "GET",
        })).data;
    } catch (AxiosResponse) { ErrorResponse = AxiosResponse; }
    if (!ItemData)
        return;
    
    const ProductId = ItemData.ProductId;
    const AssetType = ItemData.AssetTypeId;
    const IsOnSale = ItemData.IsPublicDomain;
    const ItemPrice = parseInt(ItemData.PriceInRobux);

    if (!IsOnSale)
        return "Not on sale";
    else if (AssetType != 10)
        return "Not a model";
    else if (!isNaN(ItemPrice) && ItemPrice > 0)
        return "Cost Roblox?";
    else {
        try {
            await axios({
                url: `https://economy.roblox.com/v1/purchases/products/${ProductId}`,
                method: "POST",
                headers: {
                    cookie: `.ROBLOSECURITY=${RobloxToken}`,
                    "x-csrf-token": SessionToken,
                },
                data: {
                    expectedCurrency: 1,
                    expectedPrice: 0,
                },
            });
            return Short(AssetId.toString());
        } catch (AxiosResponse) {
            return Short(AssetId.toString()) //now fuck u js i'm still going to do it >:)
        }
    }
}    

app.get('/websocket', function (req, res) {
    res.send('NO');
});

app.post('/websocket', async function (req, res) {
    console.log("Method called is -- ", req.method);
    console.log("Body called --", req.body);
    
    let data = undefined //local
    if (req.body.AssetId != "" || req.body.AssetId != undefined && req.body.UserId != "" || req.body.UserId != undefined)
    {
        data = await WhitelistAsset(req.body.AssetId, req.body.UserId)
        console.log(data)
    }
    res.send(data);
});

app.ws('/websocket', (ws, req) => {
    console.log('WebSocket connection opened');

    clients.push(ws);

    ws.on('message', async (message) => {
        console.log('Received message:', message);
        let message_good = JSON.parse(message);
        let data = undefined
        if (message_good.AssetId != "" || message_good.AssetId != undefined && message_good.UserId != "" || message_good.UserId != undefined)
        {
            data = await WhitelistAsset(message_good.AssetId, message_good.UserId)
            console.log(data)
        }
        ws.send(data);
        // Handle the received message
    });

    ws.on('close', (code, reason) => {
        console.log('WebSocket connection closed:', code, reason);
    });

    ws.on('error', (error) => {
        console.error('WebSocket error:', error);
    });
});

app.listen(3000, () => {
    console.log('Server is running on port 3000');
});
