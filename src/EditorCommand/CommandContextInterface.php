<?php

namespace Drupal\paragraphs_ckeditor\EditorCommand;

interface ComandContextInterface {
  public function getEntity();
  public function getFieldConfig();
  public function getWidgetId();
  public function isValidBundle($bundle_name);
  public function getAllowedBundles();
  public function getEditBuffer();
  public function getDelivery();
  public function setTemporary($name, $value);
  public function getTemporary($name);
  public function isValid();
}
