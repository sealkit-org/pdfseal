import { ref } from 'vue';

const globalLoading = ref(false);
const loadingMessage = ref('');

export function useGlobalLoading() {
  const showLoading = (message = 'Processing...') => {
    globalLoading.value = true;
    loadingMessage.value = message;
  };

  const hideLoading = () => {
    globalLoading.value = false;
    loadingMessage.value = '';
  };

  return {
    globalLoading,
    loadingMessage,
    showLoading,
    hideLoading
  };
}
