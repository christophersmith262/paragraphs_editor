#!/bin/bash

# Add an optional statement to see that this is running in Travis CI.
echo "running drupal_ti/before/after_script.sh"

set -e $DRUPAL_TI_DEBUG

if [ $(php -r "echo PHP_VERSION_ID;") -ge 70000 ] ; then
  export CI_JOB_ID="$TRAVIS_JOB_ID"
  export CI_BUILD_NUMBER="$TRAVIS_BUILD_NUMBER"
  export CI_PULL_REQUEST="$TRAVIS_PULL_REQUEST"
  export CI_BRANCH="$TRAVIS_BRANCH"
  composer require --no-interaction --dev "$DRUPAL_TI_COVERAGE"
  composer require --no-interaction "symfony/yaml:2.*"
  composer update --lock
  ./vendor/bin/coveralls -v
fi
