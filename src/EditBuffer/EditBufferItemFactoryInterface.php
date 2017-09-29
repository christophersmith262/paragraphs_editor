<?php

namespace Drupal\paragraphs_editor\EditBuffer;

use Drupal\paragraphs_editor\EditorCommand\CommandContextInterface;

/**
 * Represents a factory for creating edit buffer items.
 */
interface EditBufferItemFactoryInterface {

  /**
   * Creates a buffer item within a context.
   *
   * This should never be called inside an access check. Only call this after
   * context validation has completed successfully.
   *
   * @param \Drupal\paragraphs_editor\EditorCommand\CommandContextInterface $context
   *   The context for the editor instance.
   * @param string $bundle_name
   *   The bundle name for the paragraph to be created.
   *
   * @return \Drupal\paragraphs_editor\EditBuffer\EditBufferItemInterface
   *   The newly created edit buffer item.
   */
  public function createBufferItem(CommandContextInterface $context, $bundle_name);

  /**
   * Retrieves a paragraph item from within a context buffer.
   *
   * This is safe to call within access checks since we verify that the buffer
   * is set before using it. This will create the paragraph item in the buffer
   * it does not already exist.
   *
   * @param \Drupal\paragraphs_editor\EditorCommand\CommandContextInterface $context
   *   The context for the editor instance.
   * @param string $paragraph_uuid
   *   The uuid of the paragraph to retrieve.
   *
   * @return \Drupal\paragraphs_editor\EditBuffer\EditBufferItemInterface
   *   The newly created edit buffer item.
   */
  public function getBufferItem(CommandContextInterface $context, $paragraph_uuid);

  /**
   * Duplicates an edit buffer item.
   *
   * This duplicates the paragraph contained in the edit buffer item and creates
   * a new edit buffer item to contain the duplicate paragraph.
   *
   * @param \Drupal\paragraphs_editor\EditorCommand\CommandContextInterface $context
   *   The context that will receive the newly created edit buffer item.
   * @param \Drupal\paragraphs_editor\EditBuffer\EditBufferItemInterface $item
   *   The item to be duplicated.
   *
   * @return \Drupal\paragraphs_editor\EditBuffer\EditBufferItemInterface
   *   The newly created edit buffer item.
   */
  public function duplicateBufferItem(CommandContextInterface $context, EditBufferItemInterface $item);

}
