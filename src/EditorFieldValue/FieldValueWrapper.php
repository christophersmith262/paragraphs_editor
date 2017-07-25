<?php

namespace Drupal\paragraphs_editor\EditorFieldValue;

use Drupal\paragraphs\ParagraphInterface;

class FieldValueWrapper implements FieldValueWrapperInterface {

  protected $textEntity;
  protected $entities;
  protected $settings;

  public function __construct($field_definition, ParagraphInterface $text_entity, array $entities) {
    $this->textEntity = $text_entity;
    $this->setEntities($entities);
    $this->settings = $field_definition->getThirdPartySettings('paragraphs_editor');
  }

  public function getTextEntity() {
    return $this->textEntity;
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
    $this->entities = $entities;
  }

  public function addReferencedEntity($entity) {
    $this->entities[$entity->uuid()] = $entity;
  }
}
