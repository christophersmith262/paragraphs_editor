#!/bin/bash

if [ $(php -r "echo PHP_VERSION_ID;") -ge 70000 ] ; then
  echo "--coverage-clover $DRUPAL_TI_COVERAGE_FILE"
fi
