<?php

namespace Drupal\paragraphs_editor\EditorCommand;

use Drupal\Component\Utility\Crypt;
use Drupal\Component\Plugin\PluginManagerInterface;
use Drupal\Core\Entity\EntityTypeManagerInterface;
use Drupal\Core\Entity\EntityTypeBundleInfoInterface;
use Drupal\Core\Field\FieldDefinitionInterface;
use Drupal\field\FieldConfigInterface;
use Drupal\paragraphs_editor\EditBuffer\EditBufferCacheInterface;

/**
 * The default command context factory.
 *
 * @see Drupal\paragraphs_editor\EditorCommand\CommandContextFactoryInterface
 */
class CommandContextFactory implements CommandContextFactoryInterface {

  /**
   * The entity type manager for looking up entity info.
   *
   * @var Drupal\Core\Entity\EntityTypeManagerInterface
   */
  protected $entityTypeManager;

  /**
   * The buffer cache for looking up existing edit buffers.
   *
   * @var Drupal\paragraphs_editor\EditBuffer\EditBufferCacheInterface
   */
  protected $bufferCache;

  /**
   * The field config storage handler.
   *
   * @var Drupal\Core\Entity\EntityStorageInterface
   */
  protected $fieldConfigStorage;

  /**
   * A map of plugin types to plugin managers.
   *
   * @var array
   */
  protected $pluginManagers;

  /**
   * The entity bundle info service.
   *
   * @var Drupal\Core\Entity\EntityTypeBundleInfoInterface;
   */
  protected $bundleInfo;

  /**
   * Create a command context factory object.
   *
   * @param Drupal\Core\Entity\EntityTypeManagerInterface $entity_type_manager
   *   The entity type manager to use for looking up the entities and fields.
   * @param Drupal\paragraphs_editor\EditBuffer\EditBufferCacheInterface $buffer_cache
   *   The edit buffer cache to use for looking up existing edit buffers that
   *   have been persisted in the database cache.
   * @param Drupal\Component\Plugin\PluginManagerInterface $delivery_provider_manager
   *   The delivery provider plugin manager to use for creating delivery
   *   provider plugin instances.
   * @param Drupal\Component\Plugin\PluginManagerInterface $bundle_selector_manager
   *   The delivery provider plugin manager to use for creating bundle selector
   *   plugin instances.
   */
  public function __construct(EntityTypeManagerInterface $entity_type_manager, EditBufferCacheInterface $buffer_cache, EntityTypeBundleInfoInterface $bundle_info, array $plugin_managers) {
    $this->entityTypeManager = $entity_type_manager;
    $this->bufferCache = $buffer_cache;
    $this->fieldConfigStorage = $entity_type_manager->getStorage('field_config');
    $this->pluginManagers = $plugin_managers;
    $this->bundleInfo = $bundle_info;
  }

  /**
   * {@inheritdoc}
   */
  public function create($entity_type, $entity_id, $field_config_id, array $settings, $widget_build_id = NULL) {

    // If a widget build id isn't specified, we create a new one.
    if (!$widget_build_id) {
      $widget_build_id = Crypt::randomBytesBase64();
    }

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
      $bundle_filter = $this->createBundleFilter($field_config);
      $context = new CommandContext($entity, $field_config, $edit_buffer, $bundle_filter, $settings);
      $this->attachPlugin('delivery_provider', $settings, $context);
      $this->attachPlugin('bundle_selector', $settings, $context);
    }
    catch (\Exception $e) {
      return new InvalidCommandContext();
    }
    return $context;
  }

  /**
   * {@inheritdoc}
   */
  public function free(CommandContextInterface $context) {
    $this->bufferCache->delete($context->getContextString());
  }

  /**
   * {@inheritdoc}
   */
  public function getPluginManager($type) {
    return isset($this->pluginManagers[$type]) ? $this->pluginManagers[$type] : NULL;
  }

  /**
   * Creates a bundle filter object.
   *
   * @param Drupal\Core\Field\FieldDefinitionInterface $field_definition
   *   The field definition to create the filter for.
   *
   * @return Drupal\paragraphs_editor\EditorCommand\ParagraphBundleFilterInterface
   *   A filter object for the field definition.
   */
  public function createBundleFilter(FieldDefinitionInterface $field_definition) {
    return new ParagraphBundleFilter($this->bundleInfo, $field_definition);
  }

  /**
   * Helper function for instantiating plugin instances for a command context.
   *
   * @param string $type
   *   The type of plugin to be attached.
   * @param array $settings
   *   The field widget settings specifying which plugin to use.
   * @param Drupal\paragraphs_editor\EditorCommand\CommandContextInterface $context
   *   The context to attach the instantiated plugin to.
   */
  protected function attachPlugin($type, array $settings, CommandContextInterface $context) {
    $plugin_name = isset($settings[$type]) ? $settings[$type] : '';
    if ($plugin_name) {
      $plugin = $this->getPluginManager($type)->createInstance($plugin_name, array(
        'context' => $context,
      ));
      $context->setPlugin($type, $plugin);
    }
  }
}
