import { Layout } from "@/components/layout/Layout";

export default function FAQ() {
  return (
    <Layout>
      <div className="container mx-auto px-4 py-12 max-w-4xl">
        <h1 className="text-3xl md:text-4xl font-bold mb-8">Frequently Asked Questions</h1>
        <div className="space-y-6">
          {/* FAQ content here */}
        </div>
      </div>
    </Layout>
  );
}