---
title: Networking
description: Lando improves the core networking provided by Docker and Docker Compose so it is more useful in the local development context and lets containers talk to each other even across applications.
---

# Networking

Lando sets up and manages its own internal Docker network. This provides a common pattern, predictable hostnames and a more reliable experience for local development networking, generally.

Specifically, every Lando service, even those added via the `compose` top level config, should be able to communicate with every other service regardless of whether that service is part of your app or not.

Also note that because of our [automatic certificate and CA setup](./security.md), you should be able to access all of these services over `https` without needing, for example the `-k` option in `curl`.

::: warning Cross app service communication requires all apps to be running!
If you want a service in App A to talk to a service in App B then you need to make sure you've started up both apps!
:::

## Automatic Hostnames

By default, every service will get and be accessible at a hostname of the form `<service>.<app>.internal`. For example, if you have an app called `labouche` and a service called `redis`, it should be accessible from any other container using `redis.labouche.internal`.

Lando will also look at your services [proxy](../landofile/proxy.md) settings and alias those addresses to the correct service. This means that you should also be able to access services across apps using any of their proxy hostnames.

You can get information about which hostnames and urls map to what services using `lando info`.

**Note that this automatic networking only happens INSIDE of the Docker daemon and not on your host.**

### Testing

You can verify that networking is set up correctly by spinning up two `lamp` recipes called `lamp1` and `lamp2` and running a few `curl` commands.

```bash
# Verify Lamp1's appserver can access Lamp2's appserver using the proxy and .internal addresses
cd /path/to/lamp1
lando ssh -s appserver -c "curl https://lamp2.lndo.site"
lando ssh -s appserver -c "curl https://appserver.lamp2.internal"

# And the reverse
cd /path/to/lamp2
lando ssh -s appserver -c "curl https://lamp1.lndo.site"
lando ssh -s appserver -c "curl https://appserver.lamp1.internal"

# You should even by able to connect to a database in a different app
cd /path/to/lamp2
lando ssh -s database -c "mysql -uroot -h database.lamp1.internal"
```

## Accessing the host

As of Lando `3.22` you can now access your host from inside every Lando service using `host.lando.internal`

```sh
lando exec my-service -- ping host.lando.internal -c 3
```

You can also use the environment variable `LANDO_HOST_IP`.

```sh
lando exec my-service -- ping "\$LANDO_HOST_IP" -c 3
```

### WSL2 and where your IDE lives

On most platforms `host.lando.internal` just points at the machine Lando is running on and that is the end of it. WSL2 is the exception because there are _two_ candidate hosts: the Linux distro your containers are in, and the Windows side.

This matters most for step debugging. If your containers run on a `docker-ce` you installed *inside* WSL2 but PhpStorm or VS Code is listening on Windows, then the Linux side is the wrong target and Xdebug will never connect.

Lando works this out for you at start time:

| Situation | `host.lando.internal` resolves to |
| :-- | :-- |
| Not WSL2 | the Docker `host-gateway` |
| WSL2 + Docker Desktop | the Docker `host-gateway`, Docker Desktop proxies it through to Windows |
| WSL2 + `docker-ce`, `nat` mode (the default) | the WSL2 default gateway, which is the Windows `vEthernet (WSL)` adapter |
| WSL2 + `docker-ce`, `mirrored` or `bridged` mode | the Windows IP on its best default route |
| WSL2 + `docker-ce`, `virtioproxy` mode | the Windows `vEthernet (WSL)` Hyper-V switch |
| WSL2 with `networkingMode=none` | nothing, there is no network path to Windows |

If the autodetection gets it wrong you can pin it with `xdebugIdeLocation` in [Lando's global config](./global.html):

```yaml
# ~/.lando/config.yml

# "auto"      autodetect, the default
# "wsl2"      your IDE runs inside WSL2, use normal Linux behavior
# "container" your IDE listens inside the container itself
# an IP       use this address verbatim
xdebugIdeLocation: wsl2
```

You can check what Lando decided and why with:

```sh
lando config | grep -A1 hostLandoInternal
```

::: tip Xdebug still not connecting?
Windows Defender blocks inbound connections on the `vEthernet (WSL)` network by default, so port `9003` needs an exception even once `host.lando.internal` is correct. PhpStorm on Windows also listens on IPv6 first, add `-Djava.net.preferIPv4Stack=true` under **Help → Edit Custom VM Options**.

For `mirrored` mode you additionally need `hostAddressLoopback=true` under `[experimental]` in your Windows `.wslconfig`.
:::

## Network Limits

By default Docker has a limit of 32 networks. If you're running a large number of sites, you'll see a message `Lando has detected you are at Docker's network limit`, after which Lando will attempt to clean up unused networks to put you below the network limit.

If you've [modified your Docker daemon](https://discussion.fedoraproject.org/t/increase-limit-of-30-docker-networks-in-a-clean-way/96622/4) to allow more networks, you can set Lando's network limit to a higher number by setting the `networkLimit` variable in [Lando's global config](./global.html).
