<?php

namespace Drupal\paragraphs_editor\ParamConverter;

use Drupal\Core\ParamConverter\ParamConverterInterface;
use Drupal\paragraphs_editor\EditorCommand\CommandContextFactoryInterface;
use Symfony\Component\HttpFoundation\RequestStack;
use Symfony\Component\Routing\Route;

/**
 * Route parameter converter for paragraphs ckeditor command contexts.
 *
 * This is mostly a convenience wrapper so we can just pass a string that
 * uniquely identifies the editor instance, and re-assemble everything about
 * the state of the editor before the command controller gets ahold of it.
 */
class CommandContextConverter implements ParamConverterInterface {

  /**
   * The context factory for creating command contexts.
   *
   * @var \Drupal\paragraphs_editor\EditorCommand\CommandContextFactoryInterface
   */
  protected $contextFactory;

  /**
   * The current page request to pull widget field settings from.
   *
   * @var Symfony\Component\Routing\Route
   */
  protected $request;

  /**
   * Creates a paragraphs ckeditor command context route parameter converter.
   *
   * @param Symfony\Component\HttpFoundation\RequestStack $request_stack
   *   The symfony request stack service that is managing page requests.
   * @param Drupal\paragraphs_editor\EditorCommand\CommandContextFactoryInterface $context_factory
   *   The context factory to use for creating command contexts.
   */
  public function __construct(RequestStack $request_stack, CommandContextFactoryInterface $context_factory) {
    $this->contextFactory = $context_factory;
    $this->request = $request_stack->getCurrentRequest();
  }

  /**
   * {@inheritdoc}
   */
  public function convert($value, $definition, $name, array $defaults) {
    // Since a context string is just an ordered listing of information about
    // where the editor instance came from, we can separate out the ids here to
    // load the relevant plugins  and entities.
    list($field_config_id, $widget_build_id, $entity_id) = $this->contextFactory->parseContextString($value);

    // The settings array for the field widget has to be passed through the
    // request, either by POST or GET. Otherwise it's extremely difficult to get
    // back the settings from just the context.
    $settings = $this->request->get('settings');
    if (!is_array($settings)) {
      $settings = array();
    }

    $context = $this->contextFactory->create($field_config_id, $entity_id, $settings, $widget_build_id);

    $editor_context = $this->request->get('editorContext');
    if ($editor_context) {
      $context->getEditBuffer()->tagParentBuffer($editor_context);
    }

    // If the parameter definition gave any additional context about the command
    // that is being executed, we add that here so that delivery or bundle
    // selector plugins have access to it.
    if (is_array($definition)) {
      foreach ($definition as $key => $value) {
        $context->addAdditionalContext($key, $value);
      }
    }

    $editable_contexts = $this->request->get('editableContexts');
    if ($editable_contexts) {
      $context->addAdditionalContext('editable_contexts', $editable_contexts);
    }

    $module = $this->request->get('module');
    if ($module) {
      $context->addAdditionalContext('module', $module);
    }

    return $context;
  }

  /**
   * {@inheritdoc}
   */
  public function applies($definition, $name, Route $route) {
    return (!empty($definition['type']) && $definition['type'] == 'paragraphs_editor_command_context');
  }
}
