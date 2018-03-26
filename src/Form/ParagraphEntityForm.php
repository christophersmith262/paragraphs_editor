<?php

namespace Drupal\paragraphs_editor\Form;

use Drupal\Core\Ajax\AjaxResponse;
use Drupal\Core\Entity\ContentEntityForm;
use Drupal\Core\Entity\EntityManagerInterface;
use Drupal\Core\Entity\EntityTypeManagerInterface;
use Drupal\Core\Extension\ModuleHandlerInterface;
use Drupal\Core\Form\FormStateInterface;
use Drupal\paragraphs_editor\EditBuffer\EditBufferItemInterface;
use Drupal\paragraphs_editor\EditorCommand\CommandContextInterface;
use Drupal\paragraphs_editor\ParagraphsEditorFormInterface;
use Drupal\paragraphs_editor\Utility\TypeUtility;
use Drupal\paragraphs_editor\WidgetBinder\WidgetBinderDataCompilerInterface;

/**
 * The form that is shown for editing paragraph entities in ckeditor.
 *
 * This is basically just the core content entity form with a few overrides to
 * ajaxify the experience and integrate with the delivery provider plugin
 * system.
 */
class ParagraphEntityForm extends ContentEntityForm implements ParagraphsEditorFormInterface {

  /**
   * The context the editor command is being executed in.
   *
   * @var \Drupal\paragraphs_editor\EditorCommand\CommandContextInterface
   */
  protected $context;

  /**
   * The buffer item being edited by this form.
   *
   * @var \Drupal\paragraphs_editor\EditBuffer\EditBufferItemInterface
   */
  protected $bufferItem;

  /**
   * The widget binder data compiler service.
   *
   * @var \Drupal\paragraphs_editor\WidgetBinder\WidgetBinderDataCompilerInterface
   */
  protected $dataCompiler;

  /**
   * Creates a ParagraphEntityForm object.
   *
   * @param \Drupal\paragraphs_editor\EditorCommand\CommandContextInterface $context
   *   The context of the command that is invoking this form.
   * @param \Drupal\paragraphs_editor\EditBuffer\EditBufferItemInterface $item
   *   An editor item (wrapped paragraph entity) to show the edit form for.
   * @param \Drupal\Core\Extension\ModuleHandlerInterface $module_handler
   *   The module handler service.
   * @param \Drupal\Core\Entity\EntityTypeManagerInterface $entity_type_manager
   *   The entity type manager service.
   * @param \Drupal\Core\Entity\EntityManagerInterface $entity_manager
   *   The entity manager service.
   * @param \Drupal\paragraphs_editor\WidgetBinder\WidgetBinderDataCompilerInterface $data_compiler
   *   The widget binder data compiler service.
   */
  public function __construct(CommandContextInterface $context,
    EditBufferItemInterface $item,
    ModuleHandlerInterface $module_handler,
    EntityTypeManagerInterface $entity_type_manager,
    EntityManagerInterface $entity_manager,
    WidgetBinderDataCompilerInterface $data_compiler) {

    // The ContentEntityForm class actually has a whole bunch of hidden
    // dependendencies. They are injected by core via setters, however we
    // explicitly use constructor injection here to make them clear. I realize
    // this is ugly, but at least its clear (I hope).
    // The code we rely on still uses the old (deprecated) EntityManager. We
    // will rely on the standard EntityTypeManager within this class.
    parent::__construct($entity_manager);

    // Inject dependencies for parent classes.
    $this->setEntityTypeManager($entity_type_manager);
    $this->setModuleHandler($module_handler);
    $this->setEntity($item->getEntity());

    // Set dependencies for this class.
    $this->context = $context;
    $this->bufferItem = $item;
    $this->dataCompiler = $data_compiler;
  }

  /**
   * Rebuilds the additional temporary context key value pairs in the context.
   *
   * @param \Drupal\Core\Form\FormStateInterface $form_state
   *   The form state to bootstrap the additional context from.
   *
   * @return \Drupal\paragraphs_editor\EditorCommand\CommandContextInterface
   *   The bootstrapped context.
   */
  protected function bootstrapContext(FormStateInterface $form_state) {
    $saved = $form_state->getValue('paragraphs_editor_additional_context');
    if ($saved) {
      $saved = unserialize($saved);
      foreach ($saved as $key => $value) {
        $this->context->addAdditionalContext($key, $value);
      }
    }

    return $this->context;
  }

  /**
   * {@inheritdoc}
   */
  public function form(array $form, FormStateInterface $form_state) {
    $form = parent::form($form, $form_state);
    $additional_context = $this->bootstrapContext($form_state)->getAdditionalContext();
    unset($additional_context['formStateEntities']);
    $form['paragraphs_editor_additional_context'] = [
      '#type' => 'hidden',
      '#default_value' => serialize($additional_context),
    ];
    return $form;
  }

  /**
   * {@inheritdoc}
   */
  public function save(array $form, FormStateInterface $form_state) {
    $context = $this->bootstrapContext($form_state);

    // Save the changes to the editor buffer.
    $this->bufferItem->overwrite(TypeUtility::ensureParagraph($this->entity));
    $this->bufferItem->save();

    // Make properties available to the static ajax handler.
    $form_state->setTemporaryValue(['paragraphs_editor', 'data'], $this->dataCompiler->compile($context, $this->bufferItem));
    $form_state->setTemporaryValue(['paragraphs_editor', 'context'], $this->context);
  }

  /**
   * {@inheritdoc}
   */
  protected function actions(array $form, FormStateInterface $form_state) {
    $actions = parent::actions($form, $form_state);

    // Make the default entity save button submit via ajax.
    $actions['submit']['#ajax'] = [
      'callback' => [get_class($this), 'ajaxSubmit'],
    ];

    // Provide a cancel link for users to cancel the edit operation.
    $url = $this->context->createCommandUrl('cancel');
    $actions['cancel'] = [
      '#type' => 'button',
      '#value' => $this->t('Cancel'),
      '#weight' => 10,
      '#ajax' => [
        'url' => $url,
        'options' => $url->getOptions(),
      ],
    ];

    unset($actions['delete']);

    return $actions;
  }

  /**
   * Handles submissions via ajax.
   *
   * @param array $form
   *   The complete form render array.
   * @param \Drupal\Core\Form\FormStateInterface $form_state
   *   The associated form state.
   *
   * @return \Drupal\Core\Ajax\AjaxResponse
   *   An ajax response object that delivers a rendered paragraph.
   */
  public static function ajaxSubmit(array $form, FormStateInterface $form_state) {
    // Retrieve class mambers needed to build a response.
    $data = $form_state->getTemporaryValue(['paragraphs_editor', 'data']);
    $delivery = $form_state->getTemporaryValue(['paragraphs_editor', 'context'])->getPlugin('delivery_provider');

    // Create a response that includes the rendered paragraph and signal that
    // the ajax workflow is completed.
    $response = new AjaxResponse();
    $delivery->sendData($response, $data);
    $delivery->close($response);

    return $response;
  }

}
