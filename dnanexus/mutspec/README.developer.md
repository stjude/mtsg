# St. Jude Mutational Spectrum (dev)

The main script runs multiple containers with a pre-built Mutational Spectrum
image. See `README.md` for a description of the process.

## Build

```
$ docker build --tag mutspec ../..
$ dx-docker add-to-applet mutspec .
$ dx-build
```

Note dx-docker exports the image in the ACI format, which requires
[docker2aci] to be installed.

[docker2aci]: https://github.com/appc/docker2aci