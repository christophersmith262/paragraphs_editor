<?php

namespace Drupal\paragraphs_editor\EditorFieldValue;

use Drupal\paragraphs\ParagraphInterface;

class FieldValueWrapper implements FieldValueWrapperInterface {

  protected $textEntity;
  protected $entities;
  protected $settings;

  public function __construct(ParagraphInterface $text_entity, array $entities, array $children, array $settings) {
    $this->textEntity = $text_entity;
    $this->settings = $settings;
    $this->setEntities($entities);
    $this->children = $children;
  }

  public function getMarkup() {
    return $this->textEntity->{$this->settings['text_field']}->value;
  }

  public function getFormat() {
    return $this->textEntity->{$this->settings['text_field']}->format;
  }

  public function getEntities() {
    return $this->entities;
  }

  public function setMarkup($markup) {
    $this->textEntity->{$this->settings['text_field']}->value = $markup;
  }

  public function setFormat($format) {
    $this->textEntity->{$this->settings['text_field']}->format = $format;
  }

  public function setEntities(array $entities) {
    $this->entities = array();
    foreach ($entities as $entity) {
      $this->entities[] = $entity;
    }
  }

  public function getChildren() {
    return $this->children;
  }

  public function toArray() {
    return array_merge([$this->textEntity], $this->entities);
  }
}
