<?php

namespace Drupal\paragraphs_editor\EditorFieldValue;

use Drupal\paragraphs\ParagraphInterface;

/**
 * A wrapper for performing CRUD on a paragraphs editor paragraph field.
 */
interface FieldValueWrapperInterface {

  /**
   * Gets the markup stored in a paragraphs editor field.
   *
   * @return string
   *   The markup in the text paragraph.
   */
  public function getMarkup();

  /**
   * Gets the text format for the markup stored in a paragraphs editor field.
   *
   * @return string
   *   The editor format id.
   */
  public function getFormat();

  /**
   * Gets a list of all paragraphs in the paragraphs editor field.
   *
   * @return \Drupal\paragraphs\ParagraphInterface[]
   *   A list of all paragraph entities in the field including the text
   *   paragraph.
   */
  public function getEntities();

  /**
   * Sets the markup stored in a paragraphs editor field.
   *
   * @param string $markup
   *   The markup to set.
   */
  public function setMarkup($markup);

  /**
   * Sets the text format for the markup stored in a paragraphs editor field.
   *
   * @param string $format
   *   The format to use for storing markup.
   */
  public function setFormat($format);

  /**
   * Gets the paragraph holding the text for the field.
   *
   * @return \Drupal\paragraphs\ParagraphInterface
   *   The paragraph containing the markup for the field.
   */
  public function getTextEntity();

  /**
   * Gets a list of paragraph entities referenced in the text paragraph.
   *
   * @return \Drupal\paragraphs\ParagraphInterface[]
   *   An array of entities that are referenced in the text paragraph's content.
   */
  public function getReferencedEntities();

  /**
   * Gets a list of paragraph entities referenced in the text paragraph.
   *
   * @param \Drupal\paragraphs\ParagraphInterface[] $entities
   *   The list of referenced entities to store in the field.
   */
  public function setReferencedEntities(array $entities);

  /**
   * Adds a referenced entity to store in the field.
   *
   * @param \Drupal\paragraphs\ParagraphInterface $entity
   *   The paragraph entity to store a reference to.
   */
  public function addReferencedEntity(ParagraphInterface $entity);

}
