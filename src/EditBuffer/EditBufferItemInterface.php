<?php

namespace Drupal\paragraphs_editor\EditBuffer;

use Drupal\paragraphs\ParagraphInterface;

/**
 * Represents an item in an edit buffer.
 *
 * Edit buffer items contain an instance of a paragraph entity with all the
 * unsaved edits that have been made for that entity. The widget binder library
 * will use an edit buffer item to couple the drupal entity to a widget in the
 * editor.
 */
interface EditBufferItemInterface {

  /**
   * Gets the paragraph entity that is wrapped by this item.
   *
   * @return \Drupal\paragraphs\ParagraphEntity
   *   The paragraph entity that is wrapped by this item, containing any edits
   *   that have been saved to the buffer.
   */
  public function getEntity();

  /**
   * Replaces the paragraph entity wrapped by this item with another paragraph.
   */
  public function overwrite(ParagraphInterface $entity);

  /**
   * Saves the edits in this buffer item to the edit buffer cache.
   */
  public function save();

}
