# lnurl-toolbox

A web interface with tools for testing and integrating LNURL.

* [Features](#features)
* [Live Demo](#live-demo)
* [Running Your Own Instance](#running-your-own-instance)
	* [Requirements](#requirements)
	* [Setup](#setup)
	* [Remote Tunneling](#remote-tunneling)
		* [Using SSH and a VPS](#using-ssh-and-a-vps)
		* [Using ngrok](#using-ngrok)
* [Changelog](#changelog)
* [License](#license)
* [Funding](#funding)


## Features

* Supports all LNURL subprotocols (channelRequest, login, payRequest, withdrawRequest)
* Tweak parameters used for each subprotocol
* Requests and relevant events are displayed as they happen
* Inspect request/event details (HTTP headers, query string, URL, etc)
* Doesn't require an LN node (everything is mocked)


## Live Demo

An instance of this project is currently running [here](https://lnurl-toolbox.degreesofzero.com/). So if you just want to quickly test your own app's LNURL integration, please feel free to use it. If you would like run your own instance, you can follow the instructions in the rest of this document.


## Running Your Own Instance

### Requirements

* [nodejs](https://nodejs.org/) - For Linux and Mac install node via [nvm](https://github.com/creationix/nvm).
* [make](https://www.gnu.org/software/make/)


### Setup

Clone this repository:
```bash
git clone git@github.com:chill117/lnurl-toolbox.git \
	&& cd lnurl-toolbox
```

Install dependencies:
```bash
npm install
```

Run the toolbox services:
```bash
npm start
```
Do you see something like the following in your terminal?
```
Mock c-lightning JSON-RPC API listening at /path/to/lnurl-toolbox/c-lightning.sock
Mock c-lightning listening for TCP connections at 127.0.0.1:9735
Mock c-lightning is ready
Web server listening at http://localhost:8080
Lnurl server listening at http://localhost:3000
```
Great! Now open a browser to [localhost:8080](http://localhost:8080/) to view the web interface.

Note that this setup is only accessible on your local machine. If you want to be able to do some manual testing from a separate device like a phone, then you will need to expose the services to the internet - see [Remote Tunneling](#remote-tunneling).


### Remote Tunneling

For the toolbox to be useful in debugging your app, it will need to be accessible by that app. In most setups, this means that the toolbox must be accessible to the public internet. To solve this, you can setup remote tunneling to your localhost. Here are described a couple different ways to achieve this.

#### Using SSH and a VPS

You can use this method if you already have a virtual private server (VPS) with its own static, public IP address.

Login to your VPS and add a few required configurations to its SSH config file:
```bash
cat >> /etc/ssh/sshd_config << EOL
    RSAAuthentication yes
    PubkeyAuthentication yes
    GatewayPorts yes
    AllowTcpForwarding yes
    ClientAliveInterval 60
    EOL
```
Restart the SSH service:
```bash
service ssh restart
```
On your local machine, run the following command to open a reverse-proxy tunnel:
```bash
ssh -v -N -T -R 3000:localhost:3000 VPS_HOST_OR_IP_ADDRESS
```
This will forward all traffic to port 3000 to the VPS thru the SSH tunnel to port 3000 on your local machine.

Set the value of `lnurl.url` in your config.json file as follows:
```js
{
	"lnurl": {
		// ..
		"url": "http://VPS_IP_ADDRESS:3000",
		// ..
	}
}
```
Be sure to replace `VPS_IP_ADDRESS` with the actual IP address of your server.

In a second terminal window on your local machine:
```bash
ssh -v -N -T -R 9735:localhost:9735 VPS_HOST_OR_IP_ADDRESS
```
This will do the same as above but for port 9735.

Set the value of `lnurl.lightning.config.hostname` in your config.json file as follows:
```js
{
	"lnurl": {
		// ..
		"lightning": {
			"backend": "c-lightning",
			"config": {
				"host": "127.0.0.1",
				"port": 9735,
				"hostname": "VPS_IP_ADDRESS:9735"
			}
		}
		// ..
	}
}
```
Be sure to replace `VPS_IP_ADDRESS` with the actual IP address of your server.


#### Using ngrok

If you don't have access to your own VPS, [ngrok](https://ngrok.com/) is another possible solution. Follow the installation instructions on the project's website before continuing here. Once you have ngrok installed, you can continue with the instructions here.

To create an HTTP tunnel to the toolbox's LNURL server:
```bash
ngrok http -region eu 3000
```
You should see something like the following:

![](https://github.com/chill117/lnurl-toolbox/blob/master/images/ngrok-screen-https-tunnel.png)

Copy and paste the HTTPS tunnel URL to `lnurl.url` in your config.json file. Here's an example:
```js
{
	"lnurl": {
		// ..
		"url": "https://0fe4d56b.eu.ngrok.io",
		// ..
	}
}
```
Note that each time you open a tunnel with ngrok, your tunnel URL changes. 

A second tunnel is needed to forward TCP traffic to the local mock c-lightning:
```bash
ngrok tcp 9735
```
This will create a [TCP tunnel](https://ngrok.com/docs#tcp) to localhost:9735. This is needed to mock the peer connection needed for incoming channel requests; see [BOLT #1: Base Protocol](https://github.com/lightningnetwork/lightning-rfc/blob/master/01-messaging.md#bolt-1-base-protocol) for more details. Note that you will be required to sign-up for an account with ngrok.com in order to obtain an authorization token.

Copy and paste the TCP tunnel hostname to `lnurl.lightning.config.hostname` in your config.json file. Here's an example:
```js
{
	"lnurl": {
		// ..
		"lightning": {
			"backend": "c-lightning",
			"config": {
				"host": "127.0.0.1",
				"port": 9735,
				"hostname": "0.tcp.ngrok.io:11756"
			}
		}
		// ..
	}
}
```

Stop the toolbox if it's currently running - press <kbd>Ctrl</kbd> + <kbd>C</kbd>.

Start the toolbox:
```bash
npm start
```


## Changelog

See [CHANGELOG.md](https://github.com/chill117/lnurl-toolbox/blob/master/CHANGELOG.md)


## License

This software is [MIT licensed](https://tldrlegal.com/license/mit-license):
> A short, permissive software license. Basically, you can do whatever you want as long as you include the original copyright and license notice in any copy of the software/source.  There are many variations of this license in use.


## Funding

This project is free and open-source. If you would like to show your appreciation by helping to fund the project's continued development and maintenance, you can find available options [here](https://degreesofzero.com/donate.html?project=lnurl-toolbox).
