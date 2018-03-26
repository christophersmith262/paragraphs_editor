<?php

namespace Drupal\paragraphs_editor;

use Drupal\user\EntityOwnerInterface;
use Drupal\Core\Entity\ContentEntityInterface;

/**
 * An interface for paragraphs markup entities.
 *
 * This does not directly extend ParagraphInterface since we don't want code
 * that checks for ParagraphInterface to erroneously assume that this entity
 * should behave *exactly* like a paragraph since the use cases for each entity
 * type are different.
 */
interface ParagraphsMarkupInterface extends ContentEntityInterface, EntityOwnerInterface {

  /**
   * Gets the parent entity of the paragraph.
   *
   * Preserves language context with translated entities.
   *
   * @return \Drupal\Core\Entity\ContentEntityInterface
   *   The parent entity.
   */
  public function getParentEntity();

  /**
   * Gets the current value of the markup text field.
   *
   * @return string
   *   The unprocessed markup text.
   */
  public function getMarkup();

  /**
   * Gets the filter format for the markup text.
   *
   * @return string
   *   The machine name of the filter format.
   */
  public function getFormat();

  /**
   * Sets the markup text field value.
   *
   * @param string $markup
   *   The html string to set.
   */
  public function setMarkup($markup);

  /**
   * Sets the filter format used by the markup text.
   *
   * @param string $format
   *   The filter format machine name.
   */
  public function setFormat($format);

}
