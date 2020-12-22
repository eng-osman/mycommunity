# MyCommunity Live Video Server

### Contents

 - [Build and Deployment](#build-and-deployment)
 - [Live Video Workflow](#live-video-workflow)  
	 - [Reserve a channel](#reserve-a-channel)
	 - [Publish Stream](#)
	 - [Subscribe to Stream](#)
	 - Notifications

---

### Build And Deployment

The deployment is easy as 1,2,3 because we use a docker for deployment
but first we need a *nix system based  - *sorry windows users* -

anyway I assume you have installed Docker and it working, if not then google it `install docker on <put your os name here>` and oh don't expect me to help you in this.. I'm just kidding, open an issue if you have any problem :) !

next, i assume that docker is installed as `root` or a `sudo` user, I KNOW I KNOW that is very dangerous but WHO CAAAREEES !

lets get in, just go ahead  and run:
```bash
$ ./deploy.sh
```
it is a simple bash script to build and deploy the image, see it [here](https://github.com/shekohex/mycommunity-live-video/blob/master/deploy.sh)

> NOTE: if docker isn't installed as sudo user, just remove `sudo` from this script.

it may take a while, so be patient.

if everything goes well, then congrats, let's discuss the live video workflow.


###   Live Video Workflow

a simple diagram for that
 ![Workflow](https://i.imgur.com/cVu4VNV.png)
- ### Reserve a channel
see how to reserve a channel in api docs [here](http://ns544055.ip-158-69-250.net:3002/docs/#/Live_Video/post_stream_live_reserve).

after get your `channelId` then you need to create a new connection to RTMP server.
* The URL Format
`rtmp://<server-ip>:<port>/live/<channel-id>?token=<user-token>`

the server ip is your localhost ip address, since we need to test it locally, the port as it configured in `dockerfile` and `nginx.conf` file is `1935`
the channel id that random string received from the auth server, and lastly the user token.

you are now ready to publish your stream.

---

to be continued... 
