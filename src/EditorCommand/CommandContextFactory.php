<?php

namespace Drupal\paragraphs_ckeditor\EditorCommand;

use Drupal\Component\Plugin\PluginManagerInterface;
use Drupal\Core\Entity\EntityTypeManagerInterface;
use Drupal\field\FieldConfigInterface;
use Drupal\paragraphs_ckeditor\EditBuffer\EditBufferCacheInterface;

class CommandContextFactory implements CommandContextFactoryInterface {

  protected $entityTypeManager;
  protected $bufferCache;
  protected $fieldConfigStorage;
  protected $pluginManagers;

  public function __construct(EntityTypeManagerInterface $entity_type_manager, EditBufferCacheInterface $buffer_cache, PluginManagerinterface $delivery_provider_manager, PluginManagerInterface $bundle_selector_manager) {
    $this->entityTypeManager = $entity_type_manager;
    $this->bufferCache = $buffer_cache;
    $this->fieldConfigStorage = $entity_type_manager->getStorage('field_config');
    $this->pluginManagers = array(
      'bundle_selector' => $bundle_selector_manager,
      'delivery_provider' => $delivery_provider_manager,
    );
  }

  public function create($entity_type, $entity_id, $field_config_id, $widget_build_id, array $settings) {
    // If any exceptions are thrown while initializing any of the properties, we
    // return an "Invalid Command" context to signal that something is wrong
    // with the command and execution should be aborted. We do this instead of
    // bubbling the exception so that the controller access handler can deal
    // with it instead of the core exception handling.
    try {
      $context_keys = array($entity_type, $field_config_id, $widget_build_id);
      $entity_storage = $this->entityTypeManager->getStorage($entity_type);
      $field_config = $this->fieldConfigStorage->load($field_config_id);

      if ($entity_id) {
        $entity = $entity_storage->load($entity_id, $context_keys);
        $context_keys[] = $entity_id;
      }
      else {
        $entity = NULL;
      }

      $edit_buffer = $this->bufferCache->get(implode(':', $context_keys));
      $context = new CommandContext($entity, $field_config, $edit_buffer, $settings);
      $this->attachPlugin('delivery_provider', $settings, $context);
      $this->attachPlugin('bundle_selector', $settings, $context);
    }
    catch (\Exception $e) {
      return new InvalidCommandContext();
    }
    return $context;
  }

  protected function attachPlugin($type, array $settings, CommandContextInterface $context) {
    $plugin_name = isset($settings[$type]) ? $settings[$type] : '';
    $context->setPlugin($type, $this->pluginManagers[$type]->createInstance($plugin_name, array(
      'context' => $context,
    )));
  }
}
