<?php

namespace Drupal\paragraphs_editor\EditorFieldValue;

use Drupal\paragraphs\ParagraphInterface;

/**
 *
 */
class FieldValueWrapper implements FieldValueWrapperInterface {

  protected $textEntity;
  protected $referencedEntities;
  protected $settings;

  /**
   *
   */
  public function __construct($field_definition, ParagraphInterface $text_entity, array $referenced_entities) {
    $this->textEntity = $text_entity;
    $this->setReferencedEntities($referenced_entities);
    $this->settings = $field_definition->getThirdPartySettings('paragraphs_editor');
  }

  /**
   *
   */
  public function getTextEntity() {
    return $this->textEntity;
  }

  /**
   *
   */
  public function getMarkup() {
    return $this->textEntity->{$this->settings['text_field']}->value;
  }

  /**
   *
   */
  public function getFormat() {
    return $this->textEntity->{$this->settings['text_field']}->format;
  }

  /**
   *
   */
  public function getEntities() {
    return array_merge([$this->getTextEntity()], array_values($this->getReferencedEntities()));
  }

  /**
   *
   */
  public function getReferencedEntities() {
    return $this->referencedEntities;
  }

  /**
   *
   */
  public function setMarkup($markup) {
    $this->textEntity->{$this->settings['text_field']}->value = $markup;
  }

  /**
   *
   */
  public function setFormat($format) {
    $this->textEntity->{$this->settings['text_field']}->format = $format;
  }

  /**
   *
   */
  public function setReferencedEntities(array $entities) {
    $this->referencedEntities = $entities;
  }

  /**
   *
   */
  public function addReferencedEntity($entity) {
    $this->referencedEntities[$entity->uuid()] = $entity;
  }

}
