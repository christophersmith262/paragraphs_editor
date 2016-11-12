<?php

class FieldValueWrapper {

  protected $textEntity;
  protected $entities;
  protected $settings;

  public function __construct(ParagraphEntity $text_entity, array $entities, array $settings) {
    $this->textEntity = $text_entity;
    $this->entities = $entities;
    $this->settings = $settings;
  }

  public function getMarkup() {
    return $this->getTextEntity() ? $this->textEntity->{$settings['text_field']}->value : NULL;
  }

  public function getFormat() {
    return $this->getTextEntity() ? $this->textEntity->{$settings['text_field']}->format : NULL;
  }

  public function getEntities() {
    return $this->entities;
  }

  public function setMarkup($markup, $format = NULL) {
    $this->textEntity->{$settings['text_field']}->value = $markup;
    if ($format) {
      $this->textEntity->{$settings['text_field']}->format = $format;
    }
  }

  public function setEntities(array $entities) {
    $this->entities = $entities;
  }

  public function toArray() {
    $entities = array_merge([$this->textEntity], $this->entities);
  }
}
