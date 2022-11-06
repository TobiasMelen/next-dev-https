# next-dev-https

This is a minimally modified next development server with support for self signed https certificates and console QR codes. It aims to ease the hassle of using your mobile device as your primary development target. Use local https to access all the APIs that are restricted to [secure contexts](https://developer.mozilla.org/en-US/docs/Web/Security/Secure_Contexts/features_restricted_to_secure_contexts).

I pretty much had a version of this script in all my work projects so i decided to make a package.

## Usage

Install `next-dev-https` from npm with any package manager into your existing next project. Run `next-dev-https` instead of `next dev` to use this server. It works very similar to the regular next dev with two extra possible parameters:

- `--qr/-q` Print a phone scannable QR code of your dev server's local network url on startup and `q` or `Q` press.
- `--https/-s` Generate and use a self signed https certificate for the dev server.

### Example package json

```jsonc
{
 //...
 "scripts": {
   "dev": "next-dev-https --https --qr --port 4430"
   //...
 }
 //...
}
```

_Tip: Don't use a port where you regulary host http stuff, your browser will remember the protocols for urls and get confused._

## Trusted certs?

This package uses [selfsigned](https://www.npmjs.com/package/selfsigned) to generate certs and does not make your browser trust them. Even if root certs are added to your local computer, your phone and other devices will still not trust them, making the advantage very minor compared to the bad security practice of messing around with root CAs on your computer. At the time of writing (2022) most browser seems to have adequate ways of clicking through https security warnings.

## Turbopack?

Turbopack is not supported, it uses a custom rust server and looks to require changed binaries to use https. :(
