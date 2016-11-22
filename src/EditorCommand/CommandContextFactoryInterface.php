<?php

namespace Drupal\paragraphs_editor\EditorCommand;

/**
 * Provides an interface for a command context factory.
 *
 * Context factories generate command context objects that contain all the
 * context needed to uniquely identify editor instances.
 */
interface CommandContextFactoryInterface {

  /**
   * Creates a command context object.
   *
   * @param string $entity_type
   *   The entity type of the entity that owns the field being edited.
   * @param mixed $entity_id
   *   The entity id of the entity that owns the field being edited.
   * @param string $field_config_id
   *   The id of the field instance being edited.
   * @param string $widget_build_id
   *   A unique random string to identify an editor instance.
   * @param array $settings
   *   The field widget settings for the editor.
   *
   * @return Drupal\paragraphs_editor\EditorCommand\CommandContextInterface
   *   A command context object representing the context a command was executed
   *   in.
   */
  public function create($entity_type, $entity_id, $field_config_id, $widget_build_id, array $settings);
}
