from flask import Flask, request, jsonify
from sentence_transformers import SentenceTransformer, util

app = Flask(__name__)
model = SentenceTransformer('sentence-transformers/all-MiniLM-L6-v2')
#model = SentenceTransformer('sentence-transformers/multi-qa-mpnet-base-dot-v1')

@app.route('/')
def hello_world():
    return 'Welcome to koupy!'

@app.route('/api/textembedding', methods=['POST'])
def process_textembedding():
    if request.method == 'POST':
        # emb1 = model.encode("This is a red cat with a hat.")
        # emb2 = model.encode("Have you seen my red cat?")

        # cos_sim = util.cos_sim(emb1, emb2)
        # print("Cosine-Similarity:", cos_sim)

        data = request.json  # Assuming the data is sent as JSON in the request body
        embeddings = model.encode(data['text'], convert_to_numpy=True)
        nested_list = embeddings.tolist()
        return jsonify({'numpy_data': nested_list})
    else:
        return jsonify({'error': 'Only POST requests are allowed for this endpoint'})


if __name__ == '__main__':
    app.run(debug=False, host='localhost', port='5050')