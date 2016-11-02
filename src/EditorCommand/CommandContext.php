<?php

namespace Drupal\paragraphs_ckeditor\EditorCommand;

use Drupal\Core\Entity\EntityInterface;
use Drupal\Core\Url;
use Drupal\field\FieldConfigInterface;
use Drupal\paragraphs_ckeditor\EditBuffer\EditBufferInterface;
use Drupal\paragraphs_ckeditor\Plugin\ParagraphsCKEditor\DeliveryPluginInterface;

class CommandContext implements CommandContextInterface {

  protected $entity;
  protected $fieldDefinition;
  protected $editBuffer;
  protected $settings;
  protected $allowedBundles;
  protected $plugins = array();
  protected $temporary = array();
  protected $additionalContext = array();

  public function __construct(EntityInterface $entity = NULL, FieldConfigInterface $field_config = NULL, EditBufferInterface $edit_buffer = NULL, array $settings = array()) {
    $this->entity = $entity;
    $this->fieldDefinition = $field_config;
    $this->editBuffer = $edit_buffer;
    $this->settings = $settings;
  }

  public function getEntity() {
    return $this->entity;
  }

  public function getFieldConfig() {
    return $this->fieldDefinition;
  }

  public function getWidgetId() {
    return $this->editBuffer->getWidgetId();
  }

  public function isValidBundle($bundle_name) {
    return !empty($this->allowedBundles[$bundle_name]) || empty($this->allowedBundles);
  }

  public function getAllowedBundles() {
    return $this->allowedBundles;
  }

  public function getEditBuffer() {
    return $this->editBuffer;
  }

  public function getContextString() {
    return $this->editBuffer->getContextString();
  }

  public function setTemporary($name, $value) {
    $this->temporary[$name] = $value;
  }

  public function getTemporary($name) {
    return isset($this->temporary[$name]) ? $this->temporary[$name] : NULL;
  }

  public function isValid() {
    return TRUE;
  }

  protected function calculateBundles() {
  }

  public function setPlugin($type, $plugin_object) {
    $this->plugins[$type] = $plugin_object;
  }

  public function getPlugin($type) {
    return $this->plugins[$type];
  }

  public function getSetting($name) {
    return isset($this->settings[$name]) ? $this->settings[$name] : NULL;
  }

  public function getSettings() {
    return $this->settings;
  }

  public function createCommandUrl($command, array $params = array()) {
    return Url::fromRoute("paragraphs_ckeditor.command.$command", array(
      'context' => $this->getContextString(),
    ) + $params,
    array(
      'query' => array(
        'settings' => $this->getSettings(),
      ),
    ));
  }

  public function addAdditionalContext($key, $value) {
    $this->additionalContext[$key] = $value;
  }

  public function getAdditionalContext($key) {
    return isset($this->additionalContext[$key]) ? $this->additionalContext[$key] : NULL;
  }
}
