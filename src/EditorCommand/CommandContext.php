<?php

namespace Drupal\paragraphs_editor\EditorCommand;

use Drupal\Core\Entity\EntityInterface;
use Drupal\Core\Url;
use Drupal\field\FieldConfigInterface;
use Drupal\paragraphs_editor\EditBuffer\EditBufferInterface;

/**
 * Represents the command execution context.
 *
 * @see Drupal\paragraphs_editor\EditorCommand\CommandContextInterface
 */
class CommandContext implements CommandContextInterface {

  /**
   * The entity that owns the field being edited.
   *
   * @var \Drupal\Core\Entity\EntityInterface
   */
  protected $entity;

  /**
   * The field configuration for the field being edited.
   *
   * @var \Drupal\field\FieldConfigInterface
   */
  protected $fieldDefinition;

  /**
   * The edit buffer associated with the editor instance.
   *
   * @var \Drupal\paragraphs_editor\EditBuffer\EditBufferInterface
   */
  protected $editBuffer;

  /**
   * The field widget settings for the field being edited.
   *
   * @var array
   */
  protected $settings;

  /**
   * An array of paragraph bundles that can be inserted into the field.
   *
   * If this is empty, we allow all paragraph items.
   *
   * @var \Drupal\paragraphs_editor\EditorCommand\BundleFilterInterface
   */
  protected $bundleFilter;

  /**
   * A mapping of plugin types to plugin instances associated with the command.
   *
   * @var array
   */
  protected $plugins = [];

  /**
   * A temporary value store for persisting information across a single request.
   *
   * @var array
   */
  protected $temporary = [];

  /**
   * An array of additional context entries the route provided.
   *
   * @var array
   */
  protected $additionalContext = [];

  /**
   * Creates a command context object.
   *
   * @param \Drupal\Core\Entity\EntityInterface $entity
   *   The entity that the field being edited belongs to.
   * @param \Drupal\field\FieldConfigInterface $field_config
   *   The field configuration object for the field being edited.
   * @param \Drupal\paragraphs_editor\EditBuffer\EditBufferInterface $edit_buffer
   *   The edit buffer associated with the editor instance.
   * @param \Drupal\paragraphs_editor\EditorCommand\ParagraphBundleFilterInterface $bundle_filter
   *   The bundle filter for determining which paragraph bundles can be children
   *   of this context.
   * @param array $settings
   *   The field widget settings for the editor.
   */
  public function __construct(EntityInterface $entity = NULL, FieldConfigInterface $field_config = NULL, EditBufferInterface $edit_buffer = NULL, ParagraphBundleFilterInterface $bundle_filter = NULL, array $settings = []) {
    $this->entity = $entity;
    $this->fieldDefinition = $field_config;
    $this->editBuffer = $edit_buffer;
    $this->bundleFilter = $bundle_filter;
    $this->settings = $settings;
    $context_parts = explode(':', $edit_buffer->getContextString());
    $this->buildId = end($context_parts);
  }

  /**
   * {@inheritdoc}
   */
  public function getEntity() {
    return $this->entity;
  }

  /**
   * {@inheritdoc}
   */
  public function getFieldConfig() {
    return $this->fieldDefinition;
  }

  /**
   * {@inheritdoc}
   */
  public function isValidBundle($bundle_name) {
    return !empty($this->allowedBundles[$bundle_name]) || empty($this->allowedBundles);
  }

  /**
   * {@inheritdoc}
   */
  public function getBundleFilter() {
    return $this->bundleFilter;
  }

  /**
   * {@inheritdoc}
   */
  public function getEditBuffer() {
    return $this->editBuffer;
  }

  /**
   * {@inheritdoc}
   */
  public function getContextString() {
    return $this->editBuffer->getContextString();
  }

  /**
   * {@inheritdoc}
   */
  public function getBuildId() {
    return $this->buildId;
  }

  /**
   * {@inheritdoc}
   */
  public function setTemporary($name, $value) {
    $this->temporary[$name] = $value;
  }

  /**
   * {@inheritdoc}
   */
  public function getTemporary($name) {
    return isset($this->temporary[$name]) ? $this->temporary[$name] : NULL;
  }

  /**
   * {@inheritdoc}
   */
  public function isValid() {
    return TRUE;
  }

  /**
   * {@inheritdoc}
   */
  public function setPlugin($type, $plugin_object) {
    $this->plugins[$type] = $plugin_object;
  }

  /**
   * {@inheritdoc}
   */
  public function getPlugin($type) {
    return $this->plugins[$type];
  }

  /**
   * {@inheritdoc}
   */
  public function getSetting($name) {
    return isset($this->settings[$name]) ? $this->settings[$name] : NULL;
  }

  /**
   * {@inheritdoc}
   */
  public function getSettings() {
    return $this->settings;
  }

  /**
   * {@inheritdoc}
   */
  public function createCommandUrl($command, array $params = []) {
    return Url::fromRoute("paragraphs_editor.command.$command", [
      'context' => $this->getContextString(),
    ] + $params,
    [
      'query' => [
        'settings' => $this->getSettings(),
        'additional_context' => serialize($this->additionalContext),
      ],
    ]);
  }

  /**
   * {@inheritdoc}
   */
  public function addAdditionalContext($key, $value) {
    $this->additionalContext[$key] = $value;
  }

  /**
   * {@inheritdoc}
   */
  public function getAdditionalContext($key = NULL) {
    if ($key) {
      return isset($this->additionalContext[$key]) ? $this->additionalContext[$key] : NULL;
    }
    else {
      return $this->additionalContext;
    }
  }

}
