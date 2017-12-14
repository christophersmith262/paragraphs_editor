<?php

namespace Drupal\paragraphs_editor\EditorCommand;

/**
 * Provides an interface for paragraph command context.
 *
 * A context object wraps all the information you need to know about a
 * paragraphs ckeditor command that is being executed, including:
 *  - The parent entity that the command is being performed on.
 *  - The field configuration for the field the command is being performed on.
 *  - The allowed paragraph bundles for the field.
 *  - The edit buffer associated with the editor instance.
 *  - The plugins associated with the editor instance.
 *  - The field widget settings for the editor instance.
 *  - Any additional context provided by the route.
 */
interface CommandContextInterface {

  /**
   * Gets the entity that the field belongs to.
   *
   * @return \Drupal\Core\Entity\EntityInterface
   *   The entity that contains the field being edited.
   */
  public function getEntity();

  /**
   * Gets the field configuration for the field being edited.
   *
   * @return \Drupal\field\FieldConfigInterface
   *   The field configuration object for the field being edited.
   */
  public function getFieldConfig();

  /**
   * Gets a filter object for determining allowed paragraph bundles.
   *
   * @return \Drupal\paragraphs_editor\EditorCommand\ParagraphBundleFilterInterface
   *   A filter object for getting information about allowed bundles.
   */
  public function getBundleFilter();

  /**
   * Gets the edit buffer for the editor instance.
   *
   * @return \Drupal\paragraphs_editor\EditBuffer\EditBufferInterface
   *   The edit buffer associated with the editor instance that command pertains
   *   to.
   */
  public function getEditBuffer();

  /**
   * Gets the context string that uniquely identifies the editor instance.
   *
   * @return string
   *   A string containing the parent node type, parent node id, field instance
   *   id, and a unique random string to identify the instance.
   */
  public function getContextString();

  /**
   * Gets the random build id for this context.
   *
   * @return string
   *   The random build id associated with the context.
   */
  public function getBuildId();

  /**
   * Set a temporary value for the duration of command execution.
   *
   * @param string $name
   *   The key name for the temporary value.
   * @param mixed $value
   *   The temporary value to store.
   */
  public function setTemporary($name, $value);

  /**
   * Gets a temporary value.
   *
   * @param string $name
   *   The key name for the temporary value.
   */
  public function getTemporary($name);

  /**
   * Returns whether or not a context is valid.
   *
   * @return bool
   *   TRUE if the context is valid, FALSE otherwise.
   */
  public function isValid();

  /**
   * Associates a plugin with the command context.
   *
   * @param string $type
   *   The plugin type. This can be either 'bundle_selector' or
   *   'delivery_provider'.
   * @param object $plugin_object
   *   The plugin to associate.
   */
  public function setPlugin($type, $plugin_object);

  /**
   * Gets the plugin associated with the context.
   *
   * @param string $type
   *   The plugin type to retrieve. This can be either 'bundle_selector' or
   *   'delivery_provider'.
   *
   * @return object
   *   The requested plugin object if it exists, NULL otherwise.
   */
  public function getPlugin($type);

  /**
   * Gets a field widget setting.
   *
   * @param string $name
   *   The field widget setting to retrieve.
   *
   * @return mixed
   *   The value of the setting or NULL if no such setting is found.
   */
  public function getSetting($name);

  /**
   * Gets all the field widget settings.
   *
   * @return array
   *   The field widget settings associated with the editor instance.
   */
  public function getSettings();

  /**
   * Creates a url object for the specified commands.
   *
   * @param string $command
   *   The name of a command to create a url for.
   * @param array $params
   *   An optional array of query parameters to add to the Url object.
   *
   * @return \Drupal\Core\Url
   *   The Drupal url object pertaining to the command.
   */
  public function createCommandUrl($command, array $params = []);

  /**
   * Adds additional context about the command.
   *
   * @param string $key
   *   The name of the context to add.
   * @param mixed $value
   *   The value of the context to add.
   */
  public function addAdditionalContext($key, $value);

  /**
   * Gets additional context about the command.
   *
   * @param string|null $key
   *   The name of the context to get.
   *
   * @return mixed
   *   The value associated with $key or an array of all values if $key is NULL.
   */
  public function getAdditionalContext($key = NULL);

}
