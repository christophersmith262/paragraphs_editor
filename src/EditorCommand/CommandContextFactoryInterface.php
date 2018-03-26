<?php

namespace Drupal\paragraphs_editor\EditorCommand;

use Drupal\Core\Field\FieldConfigInterface;

/**
 * Provides an interface for a command context factory.
 *
 * Context factories generate command context objects that contain all the
 * context needed to uniquely identify editor instances.
 */
interface CommandContextFactoryInterface {

  /**
   * Creates a new command context object.
   *
   * @param string $field_config_id
   *   The id of the field instance being edited.
   * @param mixed $entity_id
   *   The entity id of the entity that owns the field being edited.
   * @param array $settings
   *   The field widget settings for the editor.
   * @param string|null $widget_build_id
   *   A unique random string to identify an editor instance.
   *
   * @return \Drupal\paragraphs_editor\EditorCommand\CommandContextInterface
   *   A command context object representing the context a command was executed
   *   in.
   */
  public function create($field_config_id, $entity_id, array $settings = [], $widget_build_id = NULL);

  /**
   * Gets a command context object for an existing context.
   *
   * @param string $context_id
   *   The id of the context to get.
   *
   * @return \Drupal\paragraphs_editor\EditorCommand\CommandContextInterface
   *   A command context object representing the context a command was executed
   *   in.
   */
  public function get($context_id);

  /**
   * Rebuilds a template context from a template.
   *
   * Contexts need to be regenerated whenever edits are made to avoid caching
   * issues.
   *
   * @param \Drupal\paragraphs_editor\EditorCommand\CommandContextInterface $from
   *   The context to be regenerated.
   *
   * @return \Drupal\paragraphs_editor\EditorCommand\CommandContextInterface
   *   The newly generated context.
   */
  public function regenerate(CommandContextInterface $from);

  /**
   * Frees the context from persistent storage.
   *
   * @param \Drupal\paragraphs_editor\EditorCommand\CommandContextInterface $context
   *   The context whose related storage will be freed.
   */
  public function free(CommandContextInterface $context);

  /**
   * Gets the plugin manager for a certain plugin type.
   *
   * @param string $type
   *   The plugin type to get the plugin manager for.
   *
   * @return \Drupal\Component\Plugin\PluginManagerInterface
   *   The plugin manager associated with the plugin type or NULL if no such
   *   manager exists.
   */
  public function getPluginManager($type);

  /**
   * Explodes a context string to return its parts.
   *
   * @return array
   *   An array in the form: [field_id, builid_id, entity_id].
   */
  public function parseContextString($context_string);

  /**
   * Builds the list of allowed bundles for a given field definition.
   *
   * @param \Drupal\Core\Field\FieldConfigInterface $field_config
   *   The field to build the list for.
   *
   * @return array
   *   A map where keys are allowed bundle machine names and values are maps
   *   containing the 'label' of the bundles and the 'weight' of the bundle as
   *   shown in the admin UI.
   */
  public function getAllowedBundles(FieldConfigInterface $field_config);

}
