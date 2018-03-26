<?php

namespace Drupal\paragraphs_editor\EditBuffer;

use Drupal\paragraphs\ParagraphInterface;

/**
 * Stores paragraph edits.
 *
 * The edit buffer is used to store paragraphs that are embedded in the editor's
 * markup but have not yet been saved to the database. We keep unsaved entities
 * in a persistent edit buffer until the entire content tree is saved.
 */
interface EditBufferInterface {

  /**
   * Gets the id of the context this buffer belongs to.
   *
   * @return string
   *   The buffer's context id.
   */
  public function getContextString();

  /**
   * Adds an edit buffer item to this edit buffer.
   *
   * @param \Drupal\paragraphs_editor\EditBuffer\EditBufferItemInterface $item
   *   The item to be added.
   *
   * @return \Drupal\paragraphs_editor\EditBuffer\EditBufferInterface
   *   $this for call chaining.
   */
  public function setItem(EditBufferItemInterface $item);

  /**
   * Retrieves an item from the buffer.
   *
   * @param string $paragraph_uuid
   *   The uuid of the paragraph who's edits should be retrieved.
   *
   * @return \Drupal\paragraphs_editor\EditBuffer\EditBufferItemInterface
   *   The retrieved edit buffer item.
   */
  public function getItem($paragraph_uuid);

  /**
   * Creates a new edit buffer item for a paragraph.
   *
   * @param \Drupal\paragraphs\ParagraphInterface $paragraph
   *   The paragraph to create the item for.
   *
   * @return \Drupal\paragraphs_editor\EditBuffer\EditBufferItemInterface
   *   The newly created edit buffer item.
   */
  public function createItem(ParagraphInterface $paragraph);

  /**
   * Sets the persistent cache that will store this buffer.
   *
   * Since edit buffers need to live across ajax requests, we store them in a
   * persistent (database) cache.
   *
   * @return \Drupal\paragraphs_editor\EditBuffer\EditBufferCacheInterface
   *   The persistent cache to store the edit buffer in.
   */
  public function setCache(EditBufferCacheInterface $buffer_cache);

  /**
   * Saves the edit buffer to the persistent cache.
   */
  public function save();

  /**
   * Sets the id of the buffer that is the parent of this buffer.
   *
   * This is used to track when related buffers need to be destroyed. If a
   * parent buffer is destroyed, it's children should also be destroyed.
   *
   * @param string $context_string
   *   The parent buffer id.
   */
  public function tagParentBuffer($context_string);

  /**
   * Gets the id of the buffer that is the parent of this buffer.
   *
   * @see tagParentBuffer
   *
   * @return string
   *   The parent buffer id.
   */
  public function getParentBufferTag();

  /**
   * Sets a buffer as child of this buffer.
   *
   * @param string $context_string
   *   The child buffer id.
   *
   * @see tagParentBuffer
   */
  public function addChildBufferTag($context_string);

  /**
   * Gets a list of child buffer ids.
   *
   * @see tagParentBuffer
   *
   * @return array
   *   An array of ids of child buffers.
   */
  public function getChildBufferTags();

  /**
   * Gets the properties of the buffer as an array.
   *
   * @return array
   *   An array of the buffer properties.
   */
  public function toArray();

  /**
   * Creates a copy of the buffer.
   *
   * Note that this does not duplicate every edit inside the buffer. It simply
   * creates an exact copy of this buffer with a new id. The new copy should
   * therefore replace the original buffer.
   *
   * @param string $context_string
   *   The id for the buffer that will be created.
   *
   * @return \Drupal\paragraphs_editor\EditBuffer\EditBufferInterface
   *   The newly created buffer.
   */
  public function createCopy($context_string);

}
