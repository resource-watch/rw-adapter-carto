# Resource Watch Carto Adapter

[![Build Status](https://travis-ci.org/resource-watch/rw-adapter-carto.svg?branch=develop)](https://travis-ci.org/resource-watch/rw-adapter-carto)
[![Test Coverage](https://api.codeclimate.com/v1/badges/0afec809bb5b7e1d37e7/test_coverage)](https://codeclimate.com/github/resource-watch/rw-adapter-carto/test_coverage)

This repository is the microservice that implements the carto adapter
funcionality, which is exposed on the /carto endpoint.

1. [Getting Started](#getting-started)

## Getting Started

### OS X

**First, make sure that you have the [API gateway running
locally](https://github.com/control-tower/control-tower).**

We're using Docker which, luckily for you, means that getting the
application running locally should be fairly painless. First, make sure
that you have [Docker Compose](https://docs.docker.com/compose/install/)
installed on your machine.

```
git clone https://github.com/Vizzuality/gfw-geostore-api.git
cd rw-adapter-carto
./carto.sh develop
```text

You can now access the microservice through the CT gateway.

```

### Configuration

It is necessary to define these environment variables:

* CT_URL => Control Tower URL
* NODE_ENV => Environment (prod, staging, dev)
