<?php

namespace Drupal\paragraphs_editor\EditorFieldValue;

interface FieldValueWrapperInterface {
  public function getMarkup();
  public function getFormat();
  public function getEntities();
  public function setMarkup($markup);
  public function setFormat($format);
  public function setEntities(array $entities);
  public function toArray();
}
