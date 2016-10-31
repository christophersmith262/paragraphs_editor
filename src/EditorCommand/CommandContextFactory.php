<?php

namespace Drupal\paragraphs_ckeditor\EditorCommand;

use Drupal\Core\Entity\EntityTypeManagerInterface;
use Drupal\paragraphs_ckeditor\EditBuffer\EditBufferCacheInterface;

class CommandContextFactory implements CommandContextFactoryInterface {

  protected $entityTypeManager;
  protected $bufferCache;
  protected $fieldConfigStorage;

  public function __construct(EntityTypeManagerInterface $entity_type_manager, EditBufferCacheInterface $buffer_cache) {
    $this->entityTypeManager = $entity_type_manager;
    $this->bufferCache = $buffer_cache;
    $this->fieldConfigStorage = $entity_type_manager->getStorage('field_config');
  }

  public function create($entity_type, $entity_id, $field_config_id, $widget_build_id) {
    // If any exceptions are thrown while initializing any of the properties, we
    // return an "Invalid Command" context to signal that something is wrong
    // with the command and execution should be aborted. We do this instead of
    // bubbling the exception so that the controller access handler can deal
    // with it instead of the core exception handling.
    try {
      $entity_storage = $this->entityTypeManager->getStorage($entity_type);
      $field_config = $this->fieldConfigStorage->load($field_config_id);
      $delivery_provider = $this->getDeliveryPlugin($field_config);
      $edit_buffer = $this->editBufferCache->get($widget_build_id);

      if ($entity_id) {
        $entity = $entity_storage->load($entity_id);
      }

    }
    catch (\Exception $e) {
      return new InvalidCommandContext();
    }
    return new CommandContext($entity, $field_config, $edit_buffer, $delivery_provider);
  }

  protected function getDeliveryPlugin(FieldConfigInterface $field_config) {
    $plugin_name = $field_config->getSetting('delivery_provider');
    return $this->bundleSelectorManager->createInstance($plugin_name);
  }
}
