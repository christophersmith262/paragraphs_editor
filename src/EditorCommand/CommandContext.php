<?php

namespace Drupal\paragraphs_extra\EditorCommand;

use Drupal\Core\Entity\EntityInterface;
use Drupal\field\FieldConfigInterface;
use Drupal\paragraphs_ckeditor\EditBuffer\EditBufferInterface;
use Drupal\paragraphs_ckeditor\Plugin\ParagraphsCKEditor\DeliveryPluginInterface;

class CommandContext implements CommandContextInterface {

  protected $fieldDefinition;
  protected $editBuffer;
  protected $deliveryProvider;
  protected $entity;
  protected $allowedBundles;
  protected $temporary = array();

  public function __construct(EntityInterface $entity, FieldConfigInterface $field_config, EditBufferInterface $edit_buffer, DeliveryProviderInterface $delivery_provider) {
    $this->entity = $entity;
    $this->fieldDefinition = $field_config;
    $this->editBuffer = $edit_buffer;
    $this->deliveryProvider = $delivery_provider;
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

  public function getDelivery() {
    return $this->deliveryProvider;
  }

  public function setTemporary($name, $value) {
    $this->temporary[$name] = $value;
  }

  public function getTemporary($name) {
    return isset($this->temporary[$name]) ?: NULL;
  }

  public function isValid() {
    return TRUE;
  }

  protected function calculateBundles() {
  }
}
