<?php

namespace Drupal\paragraphs_ckeditor\EditorCommand;

interface CommandContextInterface {
  public function getEntity();
  public function getFieldConfig();
  public function getWidgetId();
  public function isValidBundle($bundle_name);
  public function getAllowedBundles();
  public function getEditBuffer();
  public function setTemporary($name, $value);
  public function getTemporary($name);
  public function isValid();
  public function getContextString();
  public function setPlugin($type, $plugin_object);
  public function getPlugin($type);
}
