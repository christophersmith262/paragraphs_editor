<?php

namespace Drupal\paragraphs_editor\EditorFieldValue;

use Drupal\Core\Field\FieldConfigInterface;
use Drupal\paragraphs\ParagraphInterface;

/**
 * Wraps a paragraphs editor field.
 */
class FieldValueWrapper implements FieldValueWrapperInterface {

  /**
   * The paragraph containing the field text.
   *
   * @var \Drupal\paragraphs\ParagraphInterface
   */
  protected $textEntity;

  /**
   * A list of paragraphs referenced in the text entity.
   *
   * @var \Drupal\paragraphs\ParagraphInterface[]
   */
  protected $referencedEntities;

  /**
   * The field settings.
   *
   * @var array
   */
  protected $settings;

  /**
   * Creates a paragraphs editor field wrapper.
   *
   * @param \Drupal\Core\Field\FieldConfigInterface $field_definition
   *   The field definition to extract the field settings from.
   * @param \Drupal\paragraphs\ParagraphInterface $text_entity
   *   The paragraph containing the field text.
   * @param \Drupal\paragraphs\ParagraphInterface[] $referenced_entities
   *   A list of paragraphs referenced in the text entity.
   */
  public function __construct(FieldConfigInterface $field_definition, ParagraphInterface $text_entity, array $referenced_entities) {
    $this->textEntity = $text_entity;
    $this->setReferencedEntities($referenced_entities);
    $this->settings = $field_definition->getThirdPartySettings('paragraphs_editor');
  }

  /**
   * {@inheritdoc}
   */
  public function getTextEntity() {
    return $this->textEntity;
  }

  /**
   * {@inheritdoc}
   */
  public function getMarkup() {
    return $this->textEntity->{$this->settings['text_field']}->value;
  }

  /**
   * {@inheritdoc}
   */
  public function getFormat() {
    return $this->textEntity->{$this->settings['text_field']}->format;
  }

  /**
   * {@inheritdoc}
   */
  public function getEntities() {
    return array_merge([$this->getTextEntity()], array_values($this->getReferencedEntities()));
  }

  /**
   * {@inheritdoc}
   */
  public function getReferencedEntities() {
    return $this->referencedEntities;
  }

  /**
   * {@inheritdoc}
   */
  public function setMarkup($markup) {
    $this->textEntity->{$this->settings['text_field']}->value = $markup;
  }

  /**
   * {@inheritdoc}
   */
  public function setFormat($format) {
    $this->textEntity->{$this->settings['text_field']}->format = $format;
  }

  /**
   * {@inheritdoc}
   */
  public function setReferencedEntities(array $entities) {
    $this->referencedEntities = $entities;
  }

  /**
   * {@inheritdoc}
   */
  public function addReferencedEntity(ParagraphInterface $entity) {
    $this->referencedEntities[$entity->uuid()] = $entity;
  }

}
