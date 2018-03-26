<?php

namespace Drupal\paragraphs_editor\EditorCommand;

use Drupal\Core\Entity\EntityInterface;
use Drupal\Core\Url;
use Drupal\Core\Field\FieldConfigInterface;
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
   * @var \Drupal\Core\Field\FieldConfigInterface
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
   * A mapping of plugin types to plugin instances associated with the command.
   *
   * @var array
   */
  protected $plugins = [];

  /**
   * An array of additional context entries the route provided.
   *
   * @var array
   */
  protected $additionalContext = [];

  /**
   * The random build id identifying this context instance.
   *
   * @var string|null
   */
  protected $buildId = NULL;

  /**
   * Creates a command context object.
   *
   * @param \Drupal\Core\Entity\EntityInterface|null $entity
   *   The entity that the field being edited belongs to.
   * @param \Drupal\Core\Field\FieldConfigInterface|null $field_config
   *   The field configuration object for the field being edited.
   * @param \Drupal\paragraphs_editor\EditBuffer\EditBufferInterface|null $edit_buffer
   *   The edit buffer associated with the editor instance.
   *   of this context.
   * @param array $settings
   *   The field widget settings for the editor.
   */
  public function __construct(EntityInterface $entity = NULL, FieldConfigInterface $field_config = NULL, EditBufferInterface $edit_buffer = NULL, array $settings = []) {
    $this->entity = $entity;
    $this->fieldDefinition = $field_config;
    $this->editBuffer = $edit_buffer;
    $this->settings = $settings;
    if ($edit_buffer) {
      $context_parts = explode(':', $edit_buffer->getContextString());
      $this->buildId = end($context_parts);
    }
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
  public function getSetting($name, $default = NULL) {
    return isset($this->settings[$name]) ? $this->settings[$name] : $default;
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
    if (!empty($key)) {
      return isset($this->additionalContext[$key]) ? $this->additionalContext[$key] : NULL;
    }
    else {
      return $this->additionalContext;
    }
  }

}
